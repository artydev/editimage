# ImageSharp Server Demo

ASP.NET Core 9 Minimal API sample — **SixLabors.ImageSharp running server-side**,
called from a plain JavaScript frontend via `fetch()`.

Compare with the companion **ImageSharpWasm** project which runs the same
ImageSharp code entirely in the browser via WebAssembly.

---

## What it does

Upload any image (JPEG, PNG, WebP, GIF, BMP, TIFF). JavaScript POSTs the raw
bytes to an ASP.NET Core endpoint; ImageSharp processes them on the server and
streams back the result — no Blazor, no page reload.

| Endpoint                         | Operation                        |
|----------------------------------|----------------------------------|
| `POST /process/metadata`         | Returns JSON: width, height, format, frames |
| `POST /process/greyscale`        | Convert to greyscale             |
| `POST /process/sepia`            | Apply sepia tone                 |
| `POST /process/flip?h=true`      | Flip horizontally                |
| `POST /process/flip?v=true`      | Flip vertically                  |
| `POST /process/rotate?degrees=90`| Rotate by degrees                |
| `POST /process/resize?maxWidth=800` | Resize with Lanczos3 resampler|
| `POST /process/brightness-contrast` | Adjust brightness & contrast  |
| `POST /process/blur?sigma=3`     | Gaussian blur                    |
| `POST /process/sharpen?sigma=3`  | Gaussian sharpen                 |
| `POST /process/convert/png`      | Convert and download as PNG      |
| `POST /process/convert/webp`     | Convert and download as WebP     |

All endpoints accept `application/octet-stream` body and return `image/jpeg`
(or `image/png` / `image/webp` for the convert endpoints).

---

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9) — that's all.
  No special workloads required.

---

## Run locally

```bash
cd ImageSharpServer
dotnet run
```

Open http://localhost:5200 in your browser.

---

## Publish

```bash
dotnet publish -c Release
```

Deploy the output to any host that runs .NET 9:
- Azure App Service
- Docker container
- Fly.io / Railway / Render
- Self-hosted VPS

### Docker

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY bin/Release/net9.0/publish/ .
ENTRYPOINT ["dotnet", "ImageSharpServer.dll"]
```

---

## Project structure

```
ImageSharpServer/
├── ImageSharpServer.csproj   ← Standard Microsoft.NET.Sdk.Web
├── Program.cs                ← All Minimal API endpoints + ImageSharp logic
├── Properties/
│   └── launchSettings.json
└── wwwroot/
    ├── index.html            ← UI (identical look to WASM version)
    └── main.js               ← Pure fetch() calls, no .NET runtime in browser
```

---

## How the interop works

```
Browser (JS)
  │  POST /process/greyscale
  │  Content-Type: application/octet-stream
  │  Body: raw image bytes
  ▼
ASP.NET Core Minimal API
  │  Image.Load(bytes)
  │  image.Mutate(x => x.Grayscale())
  │  image.Save(stream, JpegEncoder)
  ▼
  HTTP 200 image/jpeg
  ▼
Browser
  URL.createObjectURL(blob) → <img>.src
```

---

## WASM vs Server comparison

| Concern               | ImageSharpWasm            | ImageSharpServer          |
|-----------------------|---------------------------|---------------------------|
| ImageSharp runs on    | Browser (WASM sandbox)    | Server (native .NET)      |
| Startup time          | ~2–3s runtime load        | Instant                   |
| ImageSharp perf       | ~3× slower without AOT    | Full native speed + SIMD  |
| Browser download      | ~5–8 MB runtime           | Just HTML/JS/CSS (~5 KB)  |
| Image privacy         | Never leaves device       | Sent to server            |
| Works offline         | Yes                       | No                        |
| Server infrastructure | None                      | Required                  |
| Special SDK/workload  | `wasm-experimental`       | Standard SDK only         |

---

## Key packages

```xml
<PackageReference Include="SixLabors.ImageSharp" Version="3.1.5" />
<PackageReference Include="SixLabors.ImageSharp.Drawing" Version="2.1.4" />
```

> **Licensing note**: ImageSharp uses the Six Labors Split License.
> Free for open-source; commercial license required for closed-source products.

---

## Further reading

- [SixLabors ImageSharp docs](https://docs.sixlabors.com/articles/imagesharp/)
- [ASP.NET Core Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [Andrew Lock — Running .NET in the browser without Blazor](https://andrewlock.net/running-dotnet-in-the-browser-without-blazor/)
"# editimage" 
