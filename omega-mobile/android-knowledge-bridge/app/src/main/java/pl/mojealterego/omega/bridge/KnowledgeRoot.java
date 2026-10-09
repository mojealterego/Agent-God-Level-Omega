package pl.mojealterego.omega.bridge;

import android.content.Context;
import android.net.Uri;

import androidx.documentfile.provider.DocumentFile;

import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.text.PDFTextStripper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class KnowledgeRoot {
    private static final Set<String> TEXT_EXT = new HashSet<>();

    static {
        String[] exts = {"txt","md","markdown","json","jsonl","csv","tsv","html","htm","xml","yaml","yml",
                "ini","toml","log","js","mjs","cjs","ts","tsx","jsx","py","java","kt","kts","c","h","cpp",
                "hpp","rs","go","sh","sql"};
        for (String e : exts) TEXT_EXT.add(e);
    }

    private final Context context;
    private final DocumentFile root;

    public KnowledgeRoot(Context context, Uri treeUri) {
        this.context = context;
        this.root = DocumentFile.fromTreeUri(context, treeUri);
        if (this.root == null || !this.root.exists() || !this.root.isDirectory() || !this.root.canRead()) {
            throw new IllegalStateException("Wybrany folder nie jest czytelny.");
        }
    }

    public JSONObject info() throws Exception {
        long files = 0;
        long dirs = 0;
        long bytes = 0;
        Deque<DocumentFile> q = new ArrayDeque<>();
        q.add(root);
        int guard = 0;
        while (!q.isEmpty() && guard++ < 50000) {
            DocumentFile dir = q.removeFirst();
            for (DocumentFile f : dir.listFiles()) {
                if (f.isDirectory()) {
                    dirs++;
                    q.addLast(f);
                } else if (f.isFile()) {
                    files++;
                    bytes += Math.max(0, f.length());
                }
            }
        }
        return new JSONObject()
                .put("configured", true)
                .put("mode", "read-only")
                .put("rootName", root.getName())
                .put("files", files)
                .put("directories", dirs)
                .put("bytes", bytes)
                .put("extractors", new JSONArray().put("text").put("html/xml").put("pdf").put("docx").put("odt"));
    }

    public JSONObject metadata(String path) throws Exception {
        DocumentFile f = resolve(path, false);
        return describe(f, normalize(path));
    }

    public JSONObject list(JSONObject params) throws Exception {
        String basePath = normalize(params.optString("path", ""));
        boolean recursive = params.optBoolean("recursive", false);
        int maxEntries = clamp(params.optInt("maxEntries", 1000), 1, 20000);
        DocumentFile base = resolve(basePath, true);
        if (!base.isDirectory()) throw new IllegalArgumentException("Ścieżka nie jest folderem.");

        JSONArray entries = new JSONArray();
        Deque<Node> q = new ArrayDeque<>();
        q.add(new Node(base, basePath));
        while (!q.isEmpty() && entries.length() < maxEntries) {
            Node n = q.removeFirst();
            for (DocumentFile child : n.file.listFiles()) {
                String p = join(n.path, child.getName());
                entries.put(describe(child, p));
                if (entries.length() >= maxEntries) break;
                if (recursive && child.isDirectory()) q.addLast(new Node(child, p));
            }
        }
        return new JSONObject()
                .put("path", basePath)
                .put("recursive", recursive)
                .put("entries", entries)
                .put("truncated", entries.length() >= maxEntries);
    }

    public JSONObject read(JSONObject params) throws Exception {
        String path = normalize(params.optString("path"));
        int maxBytes = clamp(params.optInt("maxBytes", 1048576), 1, 4194304);
        DocumentFile f = resolve(path, false);
        if (!f.isFile()) throw new IllegalArgumentException("Ścieżka nie jest plikiem.");
        String ext = extension(f.getName());
        String content;
        if ("pdf".equals(ext)) {
            content = readPdf(f, maxBytes);
        } else if ("docx".equals(ext)) {
            content = readZipXml(f, "word/document.xml", maxBytes);
        } else if ("odt".equals(ext)) {
            content = readZipXml(f, "content.xml", maxBytes);
        } else if (TEXT_EXT.contains(ext)) {
            content = readText(f, maxBytes);
            if ("html".equals(ext) || "htm".equals(ext) || "xml".equals(ext)) content = stripMarkup(content);
        } else {
            throw new IllegalArgumentException("Nieobsługiwany format: " + ext);
        }
        byte[] utf8 = content.getBytes(StandardCharsets.UTF_8);
        boolean truncated = utf8.length >= maxBytes;
        if (utf8.length > maxBytes) content = new String(utf8, 0, maxBytes, StandardCharsets.UTF_8);
        return new JSONObject()
                .put("path", path)
                .put("content", content)
                .put("truncated", truncated)
                .put("mimeType", f.getType());
    }

    public JSONObject search(JSONObject params) throws Exception {
        String query = params.optString("query", "").trim();
        if (query.isEmpty()) throw new IllegalArgumentException("Brak query.");
        String basePath = normalize(params.optString("path", ""));
        boolean recursive = params.optBoolean("recursive", true);
        int maxFiles = clamp(params.optInt("maxFiles", 250), 1, 2000);
        int maxMatches = clamp(params.optInt("maxMatches", 100), 1, 500);
        int maxBytesPerFile = clamp(params.optInt("maxBytesPerFile", 262144), 1024, 1048576);

        DocumentFile base = resolve(basePath, true);
        JSONArray matches = new JSONArray();
        JSONArray errors = new JSONArray();
        Deque<Node> q = new ArrayDeque<>();
        q.add(new Node(base, basePath));
        int scanned = 0;
        String needle = query.toLowerCase(Locale.ROOT);

        while (!q.isEmpty() && scanned < maxFiles && matches.length() < maxMatches) {
            Node n = q.removeFirst();
            for (DocumentFile child : n.file.listFiles()) {
                String p = join(n.path, child.getName());
                if (child.isDirectory()) {
                    if (recursive) q.addLast(new Node(child, p));
                    continue;
                }
                if (!child.isFile() || !supported(child.getName())) continue;
                scanned++;
                try {
                    JSONObject r = read(new JSONObject().put("path", p).put("maxBytes", maxBytesPerFile));
                    String content = r.optString("content", "");
                    String hay = content.toLowerCase(Locale.ROOT);
                    int idx = hay.indexOf(needle);
                    if (idx >= 0) {
                        int start = Math.max(0, idx - 120);
                        int end = Math.min(content.length(), idx + query.length() + 180);
                        matches.put(new JSONObject()
                                .put("path", p)
                                .put("snippet", content.substring(start, end).replaceAll("\\s+", " ").trim()));
                    }
                } catch (Exception e) {
                    errors.put(new JSONObject().put("path", p).put("error", e.getMessage()));
                }
                if (scanned >= maxFiles || matches.length() >= maxMatches) break;
            }
        }

        return new JSONObject()
                .put("query", query)
                .put("scannedFiles", scanned)
                .put("matches", matches)
                .put("errors", errors)
                .put("truncated", scanned >= maxFiles || matches.length() >= maxMatches);
    }

    private DocumentFile resolve(String raw, boolean allowRoot) {
        String path = normalize(raw);
        if (path.isEmpty()) {
            if (allowRoot) return root;
            throw new IllegalArgumentException("Pusta ścieżka.");
        }
        DocumentFile current = root;
        for (String part : path.split("/")) {
            DocumentFile next = current.findFile(part);
            if (next == null) throw new IllegalArgumentException("Nie znaleziono: " + path);
            current = next;
        }
        return current;
    }

    private String normalize(String raw) {
        String p = raw == null ? "" : raw.trim().replace('\\', '/');
        while (p.startsWith("/")) p = p.substring(1);
        while (p.endsWith("/") && !p.isEmpty()) p = p.substring(0, p.length() - 1);
        if (p.isEmpty()) return "";
        for (String part : p.split("/")) {
            if (part.isEmpty() || ".".equals(part) || "..".equals(part)) {
                throw new IllegalArgumentException("Niedozwolona ścieżka.");
            }
        }
        return p;
    }

    private JSONObject describe(DocumentFile f, String path) throws Exception {
        return new JSONObject()
                .put("path", path)
                .put("name", f.getName())
                .put("type", f.isDirectory() ? "directory" : "file")
                .put("size", f.isFile() ? Math.max(0, f.length()) : JSONObject.NULL)
                .put("lastModified", f.lastModified())
                .put("mimeType", f.getType() == null ? JSONObject.NULL : f.getType());
    }

    private String readText(DocumentFile f, int maxBytes) throws Exception {
        try (InputStream in = context.getContentResolver().openInputStream(f.getUri())) {
            if (in == null) throw new IllegalStateException("Nie można otworzyć pliku.");
            ByteArrayOutputStream out = new ByteArrayOutputStream(Math.min(maxBytes, 65536));
            byte[] buf = new byte[8192];
            int remaining = maxBytes;
            while (remaining > 0) {
                int n = in.read(buf, 0, Math.min(buf.length, remaining));
                if (n < 0) break;
                out.write(buf, 0, n);
                remaining -= n;
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private String readPdf(DocumentFile f, int maxBytes) throws Exception {
        try (InputStream in = context.getContentResolver().openInputStream(f.getUri());
             PDDocument doc = PDDocument.load(in)) {
            String text = new PDFTextStripper().getText(doc);
            return truncate(text, maxBytes);
        }
    }

    private String readZipXml(DocumentFile f, String entryName, int maxBytes) throws Exception {
        try (InputStream raw = context.getContentResolver().openInputStream(f.getUri());
             ZipInputStream zin = new ZipInputStream(raw)) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if (!entryName.equals(entry.getName())) continue;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int remaining = Math.max(maxBytes * 3, maxBytes);
                while (remaining > 0) {
                    int n = zin.read(buf, 0, Math.min(buf.length, remaining));
                    if (n < 0) break;
                    out.write(buf, 0, n);
                    remaining -= n;
                }
                return truncate(stripMarkup(out.toString(StandardCharsets.UTF_8.name())), maxBytes);
            }
        }
        throw new IllegalArgumentException("Brak zawartości dokumentu.");
    }

    private String stripMarkup(String s) {
        return s.replaceAll("(?is)<script[^>]*>.*?</script>", " ")
                .replaceAll("(?is)<style[^>]*>.*?</style>", " ")
                .replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String truncate(String s, int maxBytes) {
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        if (b.length <= maxBytes) return s;
        return new String(b, 0, maxBytes, StandardCharsets.UTF_8);
    }

    private boolean supported(String name) {
        String ext = extension(name);
        return TEXT_EXT.contains(ext) || "pdf".equals(ext) || "docx".equals(ext) || "odt".equals(ext);
    }

    private String extension(String name) {
        if (name == null) return "";
        int i = name.lastIndexOf('.');
        return i < 0 ? "" : name.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    private int clamp(int n, int min, int max) {
        return Math.max(min, Math.min(max, n));
    }

    private String join(String base, String name) {
        return base == null || base.isEmpty() ? name : base + "/" + name;
    }

    private static final class Node {
        final DocumentFile file;
        final String path;
        Node(DocumentFile file, String path) {
            this.file = file;
            this.path = path == null ? "" : path;
        }
    }
}
