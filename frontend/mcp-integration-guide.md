# YatraAI MCP Configuration

To enable deep AI discovery using the Booking.com RapidAPI Hub, add the following to your MCP client configuration (e.g., `claude_desktop_config.json` or Cursor settings).

```json
{
  "mcpServers": {
    "RapidAPI Hub - Booking COM": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.rapidapi.com",
        "--header",
        "x-api-host: booking-com15.p.rapidapi.com",
        "--header",
        "x-api-key: 452ce97ac7msh14c079a022c349bp1ea78bjsn7bb241c12f2c"
      ]
    }
  }
}
```

## Integrated Proxy
YatraAI now also includes a backend proxy for this MCP service at:
`/api/mcp/proxy`

The AI Brain can use this endpoint to call tools like `searchFlights` and `searchHotels` directly through the YatraAI infrastructure.
