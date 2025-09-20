# =================================================================================================
# FILE: api.py (FastAPI Endpoint)
# OVERVIEW:
# A FastAPI application that exposes API endpoints for backup and restore operations.
# It acts as a bridge between the Rust backend and the Python worker scripts.
# =================================================================================================
import json
import asyncio
from fastapi import FastAPI, Request
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

# --- MODIFICATION START ---
# Import the main function using the full module path from the project root.
from scripts.backup_and_restore.run import main as run_orchestrator
# --- MODIFICATION END ---

app = FastAPI()


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


@app.post("/backup")
async def backup_devices(request: BackupRequest):
    """
    Triggers a backup operation.
    """
    # Create the argument list for the run.py script based on the API request.
    args = [
        "--command",
        "backup",
        "--username",
        request.username,
        "--password",
        request.password,
    ]
    if request.hostname:
        args.extend(["--hostname", request.hostname])
    if request.inventory_file:
        args.extend(["--inventory_file", request.inventory_file])

    # Use asyncio.create_subprocess_exec to run the orchestrator and stream output.
    process = await asyncio.create_subprocess_exec(
        "python3",
        "run.py",
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    # Stream the output back to the client as Server-Sent Events (SSE) or similar.
    # For a simple, single-response API, you can just wait for the process to finish.
    stdout, _ = await process.communicate()
    output = stdout.decode().strip()

    # The last line of the output will be the final JSON result from run.py
    final_result_line = output.splitlines()[-1]
    final_result = json.loads(final_result_line)

    return final_result


@app.post("/restore")
async def restore_device(request: RestoreRequest):
    """
    Triggers a restore operation.
    """
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

    process = await asyncio.create_subprocess_exec(
        "python3",
        "run.py",
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    stdout, _ = await process.communicate()
    output = stdout.decode().strip()

    final_result_line = output.splitlines()[-1]
    final_result = json.loads(final_result_line)

    return final_result


# To handle file uploads for the Restore command's 'inventory_file'
# (assuming a future need), you could use a dedicated endpoint and process
# the file before calling your orchestrator.
