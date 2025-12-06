# Icons Repository

This directory contains icons/logos organized by category.

## Directory Structure

```
icons/
├── connectors/     # Connector logos (mqtt.png, postgresql.png, etc.)
├── applications/  # Application logos
└── drivers/       # Driver logos (fanuc.png, haas.png, etc.)
```

## Usage

Icons are served via the API using the following URL pattern:

```
GET /api/library/:category/:name/icon
GET /api/library/:category/:name/icon/:format
```

### Examples

- `GET /api/library/connectors/mqtt/icon` - Returns mqtt.png
- `GET /api/library/drivers/fanuc/icon` - Returns fanuc.png
- `GET /api/library/connectors/postgresql/icon/svg` - Returns postgresql.svg

### Supported Formats

- PNG (default)
- SVG
- JPG/JPEG

## Adding Icons

### Method 1: Upload via API

Upload icons using the API endpoints:

**Option A: Upload with category and name in URL**
```bash
POST /api/library/:category/:name/icon
Content-Type: multipart/form-data

Form data:
- icon: (file)
```

Example:
```bash
curl -X POST http://localhost:3000/api/library/connectors/mqtt/icon \
  -F "icon=@/path/to/mqtt-logo.png"
```

**Option B: Upload with category and name in form data**
```bash
POST /api/library/upload
Content-Type: multipart/form-data

Form data:
- icon: (file)
- category: connectors (optional, defaults to 'misc')
- name: mqtt (optional, defaults to 'icon')
```

Example:
```bash
curl -X POST http://localhost:3000/api/library/upload \
  -F "icon=@/path/to/mqtt-logo.png" \
  -F "category=connectors" \
  -F "name=mqtt"
```

### Method 2: Manual File Placement

1. Place icon files directly in the appropriate category directory
2. Use lowercase filenames with the format: `name.png` or `name.svg`
3. The icon will be accessible at `/api/library/category/name/icon`

## File Requirements

- **Supported formats**: PNG, JPG, JPEG, SVG
- **Maximum file size**: 5MB
- **File naming**: Use lowercase, no spaces (use hyphens or underscores)

