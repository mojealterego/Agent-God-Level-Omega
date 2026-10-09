package pl.mojealterego.omega.bridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

public class KnowledgeBridgeService extends Service {
    private static final String PREFS = "omega_bridge";
    private static final String CHANNEL = "omega_bridge";
    private static final int NOTIFICATION_ID = 8801;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private OkHttpClient client;
    private WebSocket socket;
    private volatile boolean authenticated = false;

    @Override
    public void onCreate() {
        super.onCreate();
        PDFBoxResourceLoader.init(getApplicationContext());
        createChannel();
        setConnectionStatus("ŁĄCZY...");
        startForeground(NOTIFICATION_ID, notification("Łączenie z OMEGA..."));
        client = new OkHttpClient.Builder()
                .pingInterval(20, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build();
        connect();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (socket == null) connect();
        return START_STICKY;
    }

    private void connect() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String token = prefs.getString("agent_token", "");
        String wsUrl = prefs.getString("websocket_url", "");
        String treeUri = prefs.getString("tree_uri", "");
        if (token.isEmpty() || wsUrl.isEmpty() || treeUri.isEmpty()) {
            setConnectionStatus("BRAK KONFIGURACJI");
            updateNotification("Brak konfiguracji parowania lub folderu.");
            stopSelf();
            return;
        }

        setConnectionStatus("ŁĄCZY...");
        Request request = new Request.Builder().url(wsUrl).build();
        socket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                authenticated = false;
                setConnectionStatus("UWIERZYTELNIA...");
                try {
                    webSocket.send(new JSONObject()
                            .put("type", "auth")
                            .put("token", token)
                            .toString());
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    JSONObject msg = new JSONObject(text);
                    String type = msg.optString("type");
                    if ("auth_ok".equals(type)) {
                        authenticated = true;
                        setConnectionStatus("POŁĄCZONO");
                        updateNotification("Połączono. BAZA WIEDZY jest dostępna read-only.");
                        return;
                    }
                    if ("request".equals(type)) {
                        worker.submit(() -> handleRequest(webSocket, msg, Uri.parse(treeUri)));
                    }
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onClosed(WebSocket webSocket, int code, String reason) {
                authenticated = false;
                socket = null;
                setConnectionStatus("ROZŁĄCZONO (" + code + ")");
                scheduleReconnect();
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                authenticated = false;
                socket = null;
                String message = t == null || t.getMessage() == null ? "nieznany błąd" : t.getMessage();
                setConnectionStatus("BŁĄD: " + message);
                updateNotification("Rozłączono. Ponawiam połączenie...");
                scheduleReconnect();
            }
        });
    }

    private void handleRequest(WebSocket webSocket, JSONObject msg, Uri treeUri) {
        String id = msg.optString("id", "");
        JSONObject params = msg.optJSONObject("params");
        if (params == null) params = new JSONObject();
        JSONObject response = new JSONObject();
        try {
            KnowledgeRoot root = new KnowledgeRoot(getApplicationContext(), treeUri);
            Object result;
            switch (msg.optString("method")) {
                case "knowledge.info":
                    result = root.info();
                    break;
                case "knowledge.list":
                    result = root.list(params);
                    break;
                case "knowledge.metadata":
                    result = root.metadata(params.optString("path"));
                    break;
                case "knowledge.read":
                    result = root.read(params);
                    break;
                case "knowledge.search":
                    result = root.search(params);
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported method");
            }
            response.put("type", "response").put("id", id).put("ok", true).put("result", result);
        } catch (Exception e) {
            try {
                response.put("type", "response")
                        .put("id", id)
                        .put("ok", false)
                        .put("error", new JSONObject().put("message", e.getMessage()));
            } catch (Exception ignored) {
            }
        }
        webSocket.send(response.toString());
    }

    private void scheduleReconnect() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::connect, 5000);
    }

    private void createChannel() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(
                CHANNEL, "OMEGA Knowledge Bridge", NotificationManager.IMPORTANCE_LOW));
    }

    private Notification notification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .setContentTitle("OMEGA Knowledge Bridge")
                .setContentText(text)
                .setOngoing(true)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.notify(NOTIFICATION_ID, notification(text));
    }

    private void setConnectionStatus(String value) {
        getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString("connection_status", value)
                .apply();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (socket != null) socket.close(1000, "service stopped");
        worker.shutdownNow();
        if (client != null) client.dispatcher().executorService().shutdown();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
