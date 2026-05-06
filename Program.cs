using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

var builder = WebApplication.CreateBuilder(args);

// Allow large image uploads (default is 30 MB, raise if needed)
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 50 * 1024 * 1024);

var app = builder.Build();

// Serve static files from wwwroot
app.UseStaticFiles();

// ── Health / info ────────────────────────────────────────────────────────────
app.MapGet("/", () => Results.Redirect("/index.html"));

// ── Metadata ─────────────────────────────────────────────────────────────────
app.MapPost("/process/metadata", async (HttpRequest req) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    var format = image.Metadata.DecodedImageFormat?.Name ?? "unknown";
    return Results.Ok(new MetadataResponse
    {
        Width  = image.Width,
        Height = image.Height,
        Format = format,
        Frames = image.Frames.Count,
        SizeKb = Math.Round(bytes.Length / 1024.0, 1)
    });
});

// ── Greyscale ────────────────────────────────────────────────────────────────
app.MapPost("/process/greyscale", async (HttpRequest req, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x => x.Grayscale());
    return JpegResult(image, quality);
});

// ── Sepia ────────────────────────────────────────────────────────────────────
app.MapPost("/process/sepia", async (HttpRequest req, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x => x.Sepia());
    return JpegResult(image, quality);
});

// ── Flip ─────────────────────────────────────────────────────────────────────
app.MapPost("/process/flip", async (HttpRequest req, bool h = false, bool v = false, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x =>
    {
        if (h) x.Flip(FlipMode.Horizontal);
        if (v) x.Flip(FlipMode.Vertical);
    });
    return JpegResult(image, quality);
});

// ── Rotate ───────────────────────────────────────────────────────────────────
app.MapPost("/process/rotate", async (HttpRequest req, float degrees = 90, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x => x.Rotate(degrees));
    return JpegResult(image, quality);
});

// ── Resize ───────────────────────────────────────────────────────────────────
app.MapPost("/process/resize", async (HttpRequest req, int maxWidth = 800, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    if (image.Width > maxWidth)
    {
        var newHeight = (int)((float)image.Height * maxWidth / image.Width);
        image.Mutate(x => x.Resize(maxWidth, newHeight));
    }
    return JpegResult(image, quality);
});

// ── Brightness / Contrast ────────────────────────────────────────────────────
app.MapPost("/process/brightness-contrast", async (HttpRequest req,
    float brightness = 0, float contrast = 0, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    float b = 1.0f + brightness / 100f;
    float c = 1.0f + contrast   / 100f;
    image.Mutate(x => x.Brightness(b).Contrast(c));
    return JpegResult(image, quality);
});

// ── Blur ─────────────────────────────────────────────────────────────────────
app.MapPost("/process/blur", async (HttpRequest req, float sigma = 3f, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x => x.GaussianBlur(sigma));
    return JpegResult(image, quality);
});

// ── Sharpen ──────────────────────────────────────────────────────────────────
app.MapPost("/process/sharpen", async (HttpRequest req, float sigma = 3f, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    image.Mutate(x => x.GaussianSharpen(sigma));
    return JpegResult(image, quality);
});


// ── Oil Paint (Kuwahara Filter) ───────────────────────────────────────────────
app.MapPost("/process/oil-paint", async (HttpRequest req, int levels = 10, int brushSize = 4, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load<Rgba32>(bytes);

    // Provide both levels and brushSize
    image.Mutate(x => x.OilPaint(levels, brushSize));

    return JpegResult(image, quality);
});

// ── Convert to PNG ───────────────────────────────────────────────────────────
app.MapPost("/process/convert/png", async (HttpRequest req) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    var ms = new MemoryStream();
    image.Save(ms, new PngEncoder());
    ms.Position = 0;
    return Results.File(ms, "image/png", "output.png");
});

// ── Convert to WebP ──────────────────────────────────────────────────────────
app.MapPost("/process/convert/webp", async (HttpRequest req, int quality = 85) =>
{
    var bytes = await ReadBody(req);
    using var image = Image.Load(bytes);
    var ms = new MemoryStream();
    image.Save(ms, new WebpEncoder { Quality = quality });
    ms.Position = 0;
    return Results.File(ms, "image/webp", "output.webp");
});

app.Run();

// ── Shared helpers ────────────────────────────────────────────────────────────
static async Task<byte[]> ReadBody(HttpRequest req)
{
    using var ms = new MemoryStream();
    await req.Body.CopyToAsync(ms);
    return ms.ToArray();
}

static IResult JpegResult(Image image, int quality)
{
    var ms = new MemoryStream();
    image.Save(ms, new JpegEncoder { Quality = quality });
    ms.Position = 0;
    return Results.File(ms, "image/jpeg", "output.jpg");
}

// DTO for metadata response (required for AOT compatibility)
public class MetadataResponse
{
    public int Width { get; set; }
    public int Height { get; set; }
    public string Format { get; set; } = string.Empty;
    public int Frames { get; set; }
    public double SizeKb { get; set; }
}
