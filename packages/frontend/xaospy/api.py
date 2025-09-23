# =================================================================================================
# FILE: api.py (FastAPI Endpoint)
# VERSION: 2.0.1
# OVERVIEW:
# A FastAPI application that exposes API endpoints for backup and restore operations.
# It acts as a bridge between the Rust backend and the Python worker scripts.
# Updated to include WebSocket integration for real-time job progress updates.
# =================================================================================================
import json
import asyncio
import os
import subprocess
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List, Dict
import logging
import uuid
from datetime import datetime

# Import the main function using the full module path from the project root.
from scripts.backup_and_restore.run import main as run_orchestrator

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# WebSocket manager for real-time updates
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"WebSocket client connected. Total connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            f"WebSocket client disconnected. Tota:wl connections: {len(self.active_connections)}"
        )

    async def broadcast(self, message: dict):
        """Broadcast message to all connected WebSocket clients"""
        disconnected_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {e}")
                disconnected_connections.append(connection)

        # Remove disconnected connections
        for connection in disconnected_connections:
            self.disconnect(connection)


# Initialize WebSocket manager
ws_manager = WebSocketManager()


# Pydantic models to define the expected request body for each operation.
class BackupRequest(BaseModel):
    hostname: Optional[str] = None
    inventory_file: Optional[str] = None
    username: str
    password: str


class RestoreRequest(BaseModel):
    hostname: str
    backup_file: str
    username: str
    password: str
    restore_type: str = "override"
    confirmed_commit_timeout: int = 0
    commit_timeout: int = 300


# WebSocket endpoint for real-time job progress
@app.websocket("/ws/jobs")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time job progress updates"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive - wait for ping or close
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


async def send_job_progress(
    job_id: str,
    device: str,
    job_type: str,
    event_type: str,
    status: str,
    data: dict,
    error: Optional[str] = None,
):
    """
    Send job progress update to all WebSocket clients

    Args:
        job_id: Unique job identifier
        device: Device hostname
        job_type: Type of job (backup, restore, validation, upgrade)
        event_type: Event type (started, progress, completed, failed)
        status: Current status (queued, in_progress, completed, failed)
        data: Job-specific progress data
        error: Optional error message for failed jobs
    """
    event = {
        "type": "job_progress",
        "job_id": job_id,
        "device": device,
        "job_type": job_type,
        "event_type": event_type,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "data": data,
        "error": error,
    }

    await ws_manager.broadcast(event)
    logger.info(f"Job progress sent: {job_id} - {device} - {event_type}")


async def read_process_output(process, job_id: str, device: str, job_type: str):
    """
    Read process output line by line and send progress updates

    Args:
        process: The subprocess to read from
        job_id: Job identifier for progress updates
        device: Device name for progress updates
        job_type: Type of job for progress updates

    Returns:
        The complete output as a string
    """
    output = ""
    while True:
        # Use asyncio.to_thread to run the blocking readline() call in a separate thread
        line = await asyncio.to_thread(process.stdout.readline)
        if not line:
            break

        output_line = line.strip()
        output += output_line + "\n"

        logger.debug(f"Process output: {output_line}")

        # Try to parse JSON progress updates from the script
        try:
            progress_data = json.loads(output_line)
            if isinstance(progress_data, dict):
                await send_job_progress(
                    job_id=job_id,
                    device=device,
                    job_type=job_type,
                    event_type="progress",
                    status="in_progress",
                    data=progress_data,
                )
        except json.JSONDecodeError:
            # Not a JSON line, send as generic progress
            if output_line and not output_line.isspace():
                await send_job_progress(
                    job_id=job_id,
                    device=device,
                    job_type=job_type,
                    event_type="progress",
                    status="in_progress",
                    data={"message": output_line, "raw_output": True},
                )

    return output


@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker Compose.
    Returns a simple status to confirm the API is running.
    """
    return {"status": "healthy"}


@app.get("/api/backups/devices")
async def list_backup_devices():
    """
    Lists available backup devices and their backup files.
    """
    base_path = Path("/shared/data/backups")
    if not base_path.exists():
        return {"error": "Backups directory not found", "path": str(base_path)}

    devices = {}
    try:
        for device_dir in base_path.iterdir():
            if device_dir.is_dir():
                files = [
                    f.name
                    for f in device_dir.iterdir()
                    if f.is_file() and f.suffix in [".conf", ".cfg", ".txt", ".backup"]
                ]
                if files:  # Only include devices with backup files
                    devices[device_dir.name] = files

        return {"status": "success", "devices": devices, "path": str(base_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing backups: {str(e)}")


@app.post("/api/backups/devices")
async def backup_devices(request: BackupRequest):
    """
    Triggers a backup operation with real-time progress updates.
    """
    job_id = str(uuid.uuid4())
    device = request.hostname or "multiple_devices"

    logger.info(f"Starting backup job {job_id} for {device}")

    # Send job started event
    await send_job_progress(
        job_id=job_id,
        device=device,
        job_type="backup",
        event_type="started",
        status="in_progress",
        data={
            "inventory_file": request.inventory_file,
            "username": request.username,
            "has_password": bool(request.password),
        },
    )

    output = ""  # Initialize output to avoid unbound variable
    process = None
    try:
        args = [
            "--command",
            "backup",
            "--username",
            request.username,
            "--password",
            request.password,
            "--backup_path",
            "/shared/data/backups",
        ]
        if request.hostname:
            args.extend(["--hostname", request.hostname])
        if request.inventory_file:
            args.extend(["--inventory_file", request.inventory_file])

        logger.info(
            f"Executing command: /usr/local/bin/python3 /xaospy/scripts/backup_and_restore/run.py {' '.join(args)}"
        )

        # Create a blocking subprocess with pipes
        process = subprocess.Popen(
            ["/usr/local/bin/python3", "/xaospy/scripts/backup_and_restore/run.py"]
            + args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        # Read output in real-time using the async-friendly wrapper
        output = await read_process_output(process, job_id, device, "backup")

        # Wait for the process to complete and get the final return code
        return_code = await asyncio.to_thread(process.wait)

        if return_code == 0:
            try:
                # Try to parse the final result as JSON
                final_result_line = (
                    output.strip().splitlines()[-1] if output.strip() else "{}"
                )
                final_result = json.loads(final_result_line)

                # Send job completed event
                await send_job_progress(
                    job_id=job_id,
                    device=device,
                    job_type="backup",
                    event_type="completed",
                    status="completed",
                    data=final_result,
                )

                logger.info(f"Backup completed: {final_result}")
                return final_result
            except (json.JSONDecodeError, IndexError):
                # If no valid JSON, return the raw output
                result = {"status": "completed", "output": output.strip()}
                await send_job_progress(
                    job_id=job_id,
                    device=device,
                    job_type="backup",
                    event_type="completed",
                    status="completed",
                    data=result,
                )
                return result
        else:
            error_msg = f"Backup failed with return code {return_code}"
            logger.error(f"{error_msg}. Output: {output}")

            # Send job failed event
            await send_job_progress(
                job_id=job_id,
                device=device,
                job_type="backup",
                event_type="failed",
                status="failed",
                data={"return_code": return_code, "output": output},
                error=error_msg,
            )

            raise HTTPException(status_code=500, detail=error_msg)

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)

        # Send job failed event
        await send_job_progress(
            job_id=job_id,
            device=device,
            job_type="backup",
            event_type="failed",
            status="failed",
            data={"error": error_msg, "output": output},
            error=error_msg,
        )

        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    finally:
        if process and process.poll() is None:
            process.terminate()
            await asyncio.to_thread(process.wait)


@app.post("/restore")
async def restore_device(request: RestoreRequest):
    """
    Triggers a restore operation with real-time progress updates.
    """
    job_id = str(uuid.uuid4())

    logger.info(f"Starting restore job {job_id} for {request.hostname}")

    # Send job started event
    await send_job_progress(
        job_id=job_id,
        device=request.hostname,
        job_type="restore",
        event_type="started",
        status="in_progress",
        data={
            "backup_file": request.backup_file,
            "restore_type": request.restore_type,
            "username": request.username,
            "has_password": bool(request.password),
        },
    )

    output = ""  # Initialize output to avoid unbound variable
    process = None
    try:
        args = [
            "--command",
            "restore",
            "--hostname",
            request.hostname,
            "--backup_file",
            request.backup_file,
            "--username",
            request.username,
            "--password",
            request.password,
            "--type",
            request.restore_type,
            "--confirmed_commit_timeout",
            str(request.confirmed_commit_timeout),
            "--commit_timeout",
            str(request.commit_timeout),
        ]

        logger.info(
            f"Executing restore command: /usr/local/bin/python3 /xaospy/scripts/backup_and_restore/run.py {' '.join(args)}"
        )

        process = subprocess.Popen(
            ["/usr/local/bin/python3", "/xaospy/scripts/backup_and_restore/run.py"]
            + args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        # Read output in real-time
        output = await read_process_output(process, job_id, request.hostname, "restore")

        # Wait for process to complete
        return_code = await asyncio.to_thread(process.wait)

        if return_code == 0:
            try:
                # Try to parse the final result as JSON
                final_result_line = (
                    output.strip().splitlines()[-1] if output.strip() else "{}"
                )
                final_result = json.loads(final_result_line)

                # Send job completed event
                await send_job_progress(
                    job_id=job_id,
                    device=request.hostname,
                    job_type="restore",
                    event_type="completed",
                    status="completed",
                    data=final_result,
                )

                return final_result
            except (json.JSONDecodeError, IndexError):
                # If no valid JSON, return the raw output
                result = {"status": "completed", "output": output.strip()}
                await send_job_progress(
                    job_id=job_id,
                    device=request.hostname,
                    job_type="restore",
                    event_type="completed",
                    status="completed",
                    data=result,
                )
                return result
        else:
            error_msg = f"Restore failed with return code {return_code}"
            logger.error(f"{error_msg}. Output: {output}")

            # Send job failed event
            await send_job_progress(
                job_id=job_id,
                device=request.hostname,
                job_type="restore",
                event_type="failed",
                status="failed",
                data={"return_code": return_code, "output": output},
                error=error_msg,
            )

            raise HTTPException(status_code=500, detail=error_msg)

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)

        # Send job failed event
        await send_job_progress(
            job_id=job_id,
            device=request.hostname,
            job_type="restore",
            event_type="failed",
            status="failed",
            data={"error": error_msg, "output": output},
            error=error_msg,
        )

        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    finally:
        if process and process.poll() is None:
            process.terminate()
            await asyncio.to_thread(process.wait)


@app.get("/ws/connections")
async def get_websocket_connections():
    """Get current WebSocket connection count"""
    return {"active_connections": len(ws_manager.active_connections)}


# Health check for WebSocket connections
@app.get("/ws/health")
async def websocket_health():
    """WebSocket health check endpoint"""
    return {
        "status": "healthy",
        "active_connections": len(ws_manager.active_connections),
        "timestamp": datetime.now().isoformat(),
    }
