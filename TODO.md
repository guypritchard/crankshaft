# TODO

## Tailscale integration ideas

- Add a lightweight tailscaled health check (API ping or `tailscale status`) and surface readiness in the UI before starting servers.
- Allow providing a reusable Tailscale auth key in configuration and auto-join on boot for headless hosts.
- Expose per-server advertized tags or ACL-friendly labels so tailnet policies can distinguish worlds/editions.
- Offer an optional "Enable Tailscale Funnel" toggle to publish a chosen server port externally without manual port forwarding.
- Show the assigned tailnet IP/hostname alongside the server details for quick copy/paste and troubleshooting.
