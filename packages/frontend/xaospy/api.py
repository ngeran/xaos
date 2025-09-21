# =================================================================================================
# FILE: api.py (FastAPI Endpoint)
# OVERVIEW:
# A FastAPI application that exposes API endpoints for backup and restore operations.
# It acts as a bridge between the Rust backend and the Python worker scripts.
# Updated to include a /health endpoint for Docker health checks.
# =================================================================================================
import json
import asyncio
import os
import subprocess
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import logging

# Import the main function using the full module path from the project root.
from scripts.backup_and_restore.run import main as run_orchestrator

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
                files = [f.name for f in device_dir.iterdir() if f.is_file()]
                devices[device_dir.name] = files

        return {"status": "success", "devices": devices, "path": str(base_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing backups: {str(e)}")


@app.post("/api/backups/devices")
async def backup_devices(request: BackupRequest):
    """
    Triggers a backup operation.
    """
    logger.info(f"Received backup request for {request.hostname}")
    output = ""  # Initialize output to avoid unbound variable
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

        process = await asyncio.create_subprocess_exec(
            "/usr/local/bin/python3",  # Explicit Python path
            "/xaospy/scripts/backup_and_restore/run.py",
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={
                "PYTHONPATH": "/xaospy:/usr/local/lib/python3.9/site-packages"  # Include site-packages for PyYAML
            },
        )

        stdout, _ = await process.communicate()
        output = stdout.decode().strip()

        logger.info(f"Script output: {output}")

        final_result_line = output.splitlines()[-1]
        final_result = json.loads(final_result_line)
        logger.info(f"Backup completed: {final_result}")
        return final_result
    except subprocess.CalledProcessError as e:
        logger.error(f"Subprocess error: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Execution error: {e.stderr}")
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw output: {output}")
        raise HTTPException(
            status_code=500, detail=f"Invalid JSON response from script: {e}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/restore")
async def restore_device(request: RestoreRequest):
    """
    Triggers a restore operation.
    """
    output = ""  # Initialize output to avoid unbound variable
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

        process = await asyncio.create_subprocess_exec(
            "/usr/local/bin/python3",  # Explicit Python path
            "/xaospy/scripts/backup_and_restore/run.py",
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={
                "PYTHONPATH": "/xaospy:/usr/local/lib/python3.9/site-packages"  # Include site-packages for PyYAML
            },
        )
        stdout, _ = await process.communicate()
        output = stdout.decode().strip()

        logger.info(f"Restore script output: {output}")

        final_result_line = output.splitlines()[-1]
        final_result = json.loads(final_result_line)
        return final_result
    except subprocess.CalledProcessError as e:
        logger.error(f"Subprocess error: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Execution error: {e.stderr}")
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"Raw output: {output}")
        raise HTTPException(
            status_code=500, detail=f"Invalid JSON response from script: {e}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
