import os
import json
import urllib.request

def send_to_discord(webhook_url, embed):
    payload = json.dumps({"embeds": [embed]}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "GitHub-Action-Notifier"}
    )
    try:
        # discord returns 204 No Content for success
        with urllib.request.urlopen(req) as res:
            if res.status == 204:
                return True
            else:
                print(f"Discord returned status: {res.status}")
    except Exception as e:
        print(f"Error sending to Discord: {e}")
    return False

def main():
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        print("DISCORD_WEBHOOK_URL not set")
        return

    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        print("GITHUB_EVENT_PATH not set")
        return

    with open(event_path, "r") as f:
        event = json.load(f)

    commits = event.get("commits", [])
    # Filter for commits starting with 'feat'
    filtered_commits = [c for c in commits if c.get("message", "").strip().lower().startswith("feat")]

    if not filtered_commits:
        print("No 'feat' commits found.")
        return

    repo_name = event.get("repository", {}).get("full_name", "Unknown Repository")

    for commit in filtered_commits:
        message = commit.get("message", "No message")
        url = commit.get("url", "")
        author = commit.get("author", {}).get("name", "Unknown")
        sha = commit.get("id", "")[:7]
        
        embed = {
            "title": f"[{repo_name}] New Feature: {sha}",
            "description": message,
            "url": url,
            "color": 3066993, # Greenish
            "author": {
                "name": author
            }
        }
        
        if send_to_discord(webhook_url, embed):
            print(f"Successfully notified Discord for commit: {sha}")
        else:
            print(f"Failed to notify Discord for commit: {sha}")

if __name__ == "__main__":
    main()
