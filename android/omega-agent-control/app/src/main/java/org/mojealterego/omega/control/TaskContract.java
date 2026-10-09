package org.mojealterego.omega.control;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

/** Pure-Java validated GitHub issue dispatch contract. Never stores credentials. */
public final class TaskContract {
    public static final String REPO = "mojealterego/Agent-God-Level-Omega";
    private static final Pattern SLUG = Pattern.compile("[a-z][a-z0-9-]{2,30}");
    private TaskContract() {}

    public static String normalizeSlug(String input) {
        if (input == null) throw new IllegalArgumentException("Enter project ID");
        String slug = input.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", "-");
        if (!SLUG.matcher(slug).matches()) throw new IllegalArgumentException("Project ID must have 3–31 lowercase letters, numbers or dashes, starting with a letter");
        return slug;
    }
    public static String issueTitle(String kind, String slug) {
        if (!(kind.equals("web") || kind.equals("android") || kind.equals("game") || kind.equals("api"))) throw new IllegalArgumentException("Unsupported project type");
        return "[THOR-PROJECT] " + kind + " " + normalizeSlug(slug);
    }
    public static String issueDescription(String text) {
        if (text == null) throw new IllegalArgumentException("Description required");
        String detail = text.trim();
        if (detail.isEmpty() || detail.length() > 2700) throw new IllegalArgumentException("Task description must contain 1–2700 characters");
        return detail;
    }
    public static String githubIssueCreateLink(String kind, String slug, String detail) {
        return "https://github.com/"+REPO+"/issues/new?title="+enc(issueTitle(kind,slug))+"&body="+enc(issueDescription(detail));
    }
    static String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
