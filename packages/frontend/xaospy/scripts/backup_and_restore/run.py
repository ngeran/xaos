#!/usr/bin/env python3
# =================================================================================================
#
# FILE:               run.py (Orchestrator for Backup & Restore)
#
# OVERVIEW:
#   High-performance, asynchronous orchestrator for running backup and restore operations
#   on Juniper devices. This script parses command-line arguments, manages workflows,
#   and emits standardized, single-line JSON progress updates for real-time frontend consumption.
#
# KEY FEATURES:
#   - Standardized JSON Output: All progress and result events are sent to `stdout` as single-line JSON.
#   - Dual Operation Modes: Supports 'backup' and 'restore' via the `--command` flag.
#   - Concurrent Operations: Uses asyncio for parallel backups.
#   - Flexible Targeting: Supports single host or YAML inventory file.
#   - Decoupled Worker Logic: Progress reporting via callback for granular UI updates.
#
# =================================================================================================
 
import argparse
import json
import sys
import logging
import traceback
import yaml
import asyncio
from pathlib import Path
from datetime import datetime
 
# Local worker classes
sys.path.append(str(Path(__file__).parent))
from BackupConfig import BackupManager
from RestoreConfig import RestoreManager
 
# =================================================================================================
# SECTION 2: UTILITIES & CONFIGURATION
# =================================================================================================
 
def setup_logging():
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        formatter = logging.Formatter(
            "%(asctime)s - [ORCHESTRATOR] - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
 
def send_progress(level: str, event_type: str, data: dict, message: str = ""):
    """
    Emit a structured JSON progress event to stdout (for FastAPI/WS consumption)
    """
    progress_update = {
        "level": level.upper(),
        "event_type": event_type,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }
    print(json.dumps(progress_update), file=sys.stdout, flush=True)
 
def parse_inventory_file(inventory_path: Path) -> list[str]:
    with open(inventory_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, list):
        raise TypeError(
            f"Inventory file '{inventory_path.name}' is not a valid YAML list."
        )
    return [
        d["ip_address"]
        for loc in data
        for dt in ["routers", "switches"]
        for d in loc.get(dt, [])
        if d.get("vendor", "").upper() == "JUNIPER" and d.get("ip_address")
    ]
 
# =================================================================================================
# SECTION 3: MAIN ASYNCHRONOUS ORCHESTRATOR
# =================================================================================================
 
async def main():
    logger = setup_logging()
    parser = argparse.ArgumentParser(
        description="Juniper Backup and Restore Orchestrator"
    )
    parser.add_argument("--command", choices=["backup", "restore"], required=True)
    parser.add_argument("--hostname")
    parser.add_argument("--inventory_file")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--backup_path", default="/backups")
    parser.add_argument("--backup_file")
    parser.add_argument("--type", default="override", choices=["override", "merge", "update"])
    parser.add_argument("--confirmed_commit_timeout", type=int, default=0)
    parser.add_argument("--commit_timeout", type=int, default=300)
 
    final_results = {}
    is_overall_success = False
    try:
        args = parser.parse_args()
 
        # ---------------------------------------------------------------------------------------------
        # Backup Workflow
        # ---------------------------------------------------------------------------------------------
        if args.command == "backup":
            # Determine list of hosts
            if args.inventory_file:
                inventory_path = Path(args.inventory_file)
                if not inventory_path.is_file():
                    raise FileNotFoundError(
                        f"Inventory file not found at: {inventory_path}"
                    )
                hosts_to_run = parse_inventory_file(inventory_path)
            elif args.hostname:
                hosts_to_run = [
                    h.strip() for h in args.hostname.split(",") if h.strip()
                ]
            else:
                raise ValueError("No target specified. Use --hostname or --inventory_file for backup.")
 
            if not hosts_to_run:
                raise ValueError("No target hosts found for backup.")
 
            total_steps = len(hosts_to_run) * 2  # (Connect + Backup per host)
            send_progress(
                "info",
                "OPERATION_START",
                {"total_steps": total_steps},
                f"Starting backup for {len(hosts_to_run)} device(s)",
            )
 
            # Async backup on all devices
            tasks = [
                BackupManager(
                    h,
                    args.username,
                    args.password,
                    Path(args.backup_path),
                    i * 2,
                    send_progress,
                ).run_backup()
                for i, h in enumerate(hosts_to_run)
            ]
            results = await asyncio.gather(*tasks)
 
            succeeded = {
                data["host"]: data for status, data in results if status == "SUCCESS"
            }
            failed = {
                data["host"]: data["error"]
                for status, data in results
                if status == "FAILED"
            }
            is_overall_success = not failed
            final_results = {
                "success": is_overall_success,
                "message": f"Backup finished. Succeeded: {len(succeeded)}, Failed: {len(failed)}.",
                "details": {"succeeded": succeeded, "failed": failed},
            }
 
        # ---------------------------------------------------------------------------------------------
        # Restore Workflow
        # ---------------------------------------------------------------------------------------------
        elif args.command == "restore":
            if not args.hostname:
                raise ValueError("A target --hostname is required for the restore command.")
            if not args.backup_file:
                raise ValueError("A --backup_file name is required for the restore command.")
            send_progress(
                "info",
                "OPERATION_START",
                {"total_steps": 4},
                f"Starting restore for {args.hostname}",
            )
            manager = RestoreManager(
                host=args.hostname,
                username=args.username,
                password=args.password,
                backup_path=Path(args.backup_path),
                backup_file=args.backup_file,
                restore_type=args.type,
                confirmed_timeout=args.confirmed_commit_timeout,
                commit_timeout=args.commit_timeout,
                step_offset=0,
                progress_callback=send_progress,
            )
            status, data = await manager.run_restore()
            is_overall_success = status == "SUCCESS"
            final_results = {
                "success": is_overall_success,
                "message": data.get("message", data.get("error")),
                "details": data,
            }
 
        # Announce the completion of the entire operation.
        send_progress(
            "success" if is_overall_success else "error",
            "OPERATION_COMPLETE",
            {"status": "SUCCESS" if is_overall_success else "FAILED"},
            "All operations finished.",
        )
 
    except Exception as e:
        error_msg = f"A critical error occurred in the orchestrator: {e}"
        logger.error(error_msg, exc_info=True)
        send_progress("error", "OPERATION_COMPLETE", {"status": "FAILED"}, error_msg)
        final_results = {
            "success": False,
            "message": error_msg,
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(final_results))
        sys.exit(1)
 
    print(json.dumps(final_results))
    sys.exit(0 if is_overall_success else 1)
 
if __name__ == "__main__":
    asyncio.run(main())