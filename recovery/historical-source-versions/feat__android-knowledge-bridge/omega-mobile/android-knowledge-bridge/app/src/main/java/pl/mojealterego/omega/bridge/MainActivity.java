package pl.mojealterego.omega.bridge;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MainActivity extends AppCompatActivity {
    private static final int PICK_TREE = 7001;
    private static final String PREFS = "omega_bridge";
    private static final String RELAY_BASE = "https://omega-termux-knowledge-relay.onrender.com";

    private SharedPreferences prefs;
    private TextView status;
    private EditText pairCode;
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(@Nullable Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        setContentView(buildUi());
        refreshStatus();
        maybeStartService();
    }

    private LinearLayout buildUi() {
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("OMEGA Knowledge Bridge");
        title.setTextSize(26);
        root.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText("Read-only dostęp do BAZA WIEDZY dla OMEGA MCP. Bez Termuxa.");
        subtitle.setTextSize(16);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subLp.setMargins(0, pad / 2, 0, pad);
        root.addView(subtitle, subLp);

        pairCode = new EditText(this);
        pairCode.setHint("Kod parowania");
        pairCode.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        root.addView(pairCode, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button pair = new Button(this);
        pair.setText("1. Sparuj z OMEGA");
        pair.setOnClickListener(v -> pairRelay());
        root.addView(pair, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button folder = new Button(this);
        folder.setText("2. Wybierz folder BAZA WIEDZY");
        folder.setOnClickListener(v -> chooseFolder());
        root.addView(folder, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button start = new Button(this);
        start.setText("3. Uruchom most");
        start.setOnClickListener(v -> {
            maybeStartService();
            refreshStatus();
        });
        root.addView(start, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        status = new TextView(this);
        status.setTextSize(15);
        LinearLayout.LayoutParams stLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        stLp.setMargins(0, pad, 0, 0);
        root.addView(status, stLp);
        return root;
    }

    private void pairRelay() {
        String code = pairCode.getText().toString().trim();
        if (code.isEmpty()) {
            Toast.makeText(this, "Wpisz kod parowania.", Toast.LENGTH_SHORT).show();
            return;
        }
        status.setText("Parowanie...");
        io.submit(() -> {
            OkHttpClient client = new OkHttpClient();
            try {
                JSONObject body = new JSONObject().put("code", code);
                Request req = new Request.Builder()
                        .url(RELAY_BASE + "/pair")
                        .post(RequestBody.create(body.toString(), MediaType.get("application/json; charset=utf-8")))
                        .build();
                try (Response response = client.newCall(req).execute()) {
                    String text = response.body() == null ? "" : response.body().string();
                    if (!response.isSuccessful()) {
                        throw new IOException("Parowanie odrzucone: HTTP " + response.code());
                    }
                    JSONObject result = new JSONObject(text);
                    String token = result.getString("agent_token");
                    String wsUrl = result.getString("websocket_url");
                    prefs.edit()
                            .putString("agent_token", token)
                            .putString("websocket_url", wsUrl)
                            .apply();
                    runOnUiThread(() -> {
                        pairCode.setText("");
                        Toast.makeText(this, "Sparowano.", Toast.LENGTH_SHORT).show();
                        refreshStatus();
                        maybeStartService();
                    });
                }
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd parowania: " + e.getMessage()));
            }
        });
    }

    private void chooseFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, PICK_TREE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_TREE || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException ignored) {
        }
        prefs.edit().putString("tree_uri", uri.toString()).apply();
        refreshStatus();
        maybeStartService();
    }

    private void maybeStartService() {
        String token = prefs.getString("agent_token", "");
        String tree = prefs.getString("tree_uri", "");
        if (token.isEmpty() || tree.isEmpty()) return;
        Intent service = new Intent(this, KnowledgeBridgeService.class);
        startForegroundService(service);
    }

    private void refreshStatus() {
        if (status == null) return;
        boolean paired = !prefs.getString("agent_token", "").isEmpty();
        boolean folder = !prefs.getString("tree_uri", "").isEmpty();
        status.setText("Parowanie: " + (paired ? "OK" : "BRAK")
                + "\nFolder: " + (folder ? "OK" : "BRAK")
                + "\nMost: " + (paired && folder ? "gotowy do połączenia" : "oczekuje"));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        io.shutdownNow();
    }
}
