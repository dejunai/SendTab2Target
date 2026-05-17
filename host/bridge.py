import sys
import json
import struct
import subprocess
import os
import shutil

def get_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0: sys.exit(0)
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message_content):
    content = json.dumps(message_content).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('@I', len(content)))
    sys.stdout.buffer.write(content)
    sys.stdout.buffer.flush()

def main():
    while True:
        try:
            msg = get_message()
            url = msg.get('url')
            browser = msg.get('browser') or r"C:\Program Files\Google\Chrome\Application\chrome.exe"

            # Normalize browser path and try to launch the URL with it when possible.
            if sys.platform == "darwin":
                if browser:
                    # 'open -a' handles both app names and absolute paths on macOS
                    subprocess.Popen(['open', '-a', browser, url])
                else:
                    subprocess.Popen(['open', url])
            elif sys.platform == "win32":
                if browser:
                    try:
                        # Try direct execution first
                        subprocess.Popen([browser, url], shell=False)
                    except Exception:
                        # Fallback for Windows Store Apps (Execution Aliases) or .bat files
                        # We use 'start' but explicitly pass the browser so we don't lose the user's choice
                        subprocess.Popen(['cmd', '/c', 'start', '', browser, url], shell=True)
                else:
                    # Let Windows open using default handler
                    os.startfile(url)
            else:
                # On Linux/other
                if browser:
                    subprocess.Popen([browser, url])
                else:
                    subprocess.Popen(['xdg-open', url])

            send_message({"status": "success"})
        except Exception as e:
            send_message({"status": "error", "error": str(e)})

if __name__ == "__main__":
    main()