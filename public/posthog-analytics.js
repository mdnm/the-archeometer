(function () {
  var config = window.__ARCHEOMETER_ANALYTICS__ || {};
  var key = config.posthogKey;
  var host = config.posthogHost || "https://us.i.posthog.com";
  var allowedHosts = ["thearcheometer.com", "www.thearcheometer.com"];

  if (!key || allowedHosts.indexOf(window.location.hostname) === -1) {
    return;
  }

  var distinctIdKey = "archeometer:posthog_distinct_id";
  var sessionKey = "archeometer:analytics_session";
  var attributionKey = "archeometer:attribution";
  var engagementTracked = false;
  var toolResultTracked = {};

  function getOrCreateStorageValue(storage, storageKey, prefix) {
    try {
      var existing = storage.getItem(storageKey);
      if (existing) return existing;

      var value = prefix + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      storage.setItem(storageKey, value);
      return value;
    } catch (_error) {
      return prefix + "_anonymous";
    }
  }

  function getDistinctId() {
    return getOrCreateStorageValue(window.localStorage, distinctIdKey, "anon");
  }

  function getSessionId() {
    return getOrCreateStorageValue(window.sessionStorage, sessionKey, "session");
  }

  function normalizePath(pathname) {
    if (pathname === "/") return "/";
    return pathname.replace(/\/$/, "");
  }

  function getPathGroup(pathname) {
    var path = normalizePath(pathname);
    if (path === "/") return "home";
    if (path === "/archeometer") return "archeometer_tool";
    if (path === "/natal-chart") return "natal_chart_tool";
    if (path.indexOf("/chapters/") === 0) return "chapter";
    return "other";
  }

  function getSurface(pathname) {
    var group = getPathGroup(pathname);
    if (group === "chapter") return "reader";
    if (group === "archeometer_tool") return "archeometer";
    if (group === "natal_chart_tool") return "natal_chart";
    return group;
  }

  function getToolType(pathname) {
    var group = getPathGroup(pathname);
    if (group === "archeometer_tool") return "archeometer_visual";
    if (group === "natal_chart_tool") return "natal_chart";
    return null;
  }

  function getAttribution() {
    var params = new URLSearchParams(window.location.search);
    var next = {};
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "source_app",
      "source_surface",
      "source_campaign",
    ].forEach(function (name) {
      var value = params.get(name);
      if (value) next[name] = value.slice(0, 120);
    });

    try {
      if (Object.keys(next).length > 0) {
        window.sessionStorage.setItem(attributionKey, JSON.stringify(next));
        return next;
      }

      var existing = window.sessionStorage.getItem(attributionKey);
      return existing ? JSON.parse(existing) : {};
    } catch (_error) {
      return next;
    }
  }

  function getReferrerDomain() {
    if (!document.referrer) return null;

    try {
      var url = new URL(document.referrer);
      if (url.hostname === window.location.hostname) return null;
      return url.hostname;
    } catch (_error) {
      return null;
    }
  }

  function compactProperties(properties) {
    var allowed = [
      "app",
      "env",
      "surface",
      "path_group",
      "pathname",
      "referrer_domain",
      "session_id",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "source_app",
      "source_surface",
      "source_campaign",
      "tool_type",
      "result_type",
      "outbound_domain",
      "cta_type",
      "engagement_type",
    ];
    var compacted = {};

    allowed.forEach(function (name) {
      var value = properties[name];
      if (value === undefined || value === null || value === "") return;
      compacted[name] = typeof value === "string" ? value.slice(0, 160) : value;
    });

    return compacted;
  }

  function baseProperties(extra) {
    var attribution = getAttribution();
    return compactProperties(
      Object.assign(
        {
          app: "archeometer",
          env: "production",
          surface: getSurface(window.location.pathname),
          path_group: getPathGroup(window.location.pathname),
          pathname: normalizePath(window.location.pathname),
          referrer_domain: getReferrerDomain(),
          session_id: getSessionId(),
        },
        attribution,
        extra || {},
      ),
    );
  }

  function capture(eventName, properties) {
    var body = JSON.stringify({
      api_key: key,
      event: eventName,
      properties: Object.assign(
        {
          distinct_id: getDistinctId(),
        },
        baseProperties(properties),
      ),
    });

    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(host + "/capture/", blob)) return;
    }

    fetch(host + "/capture/", {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: body,
    }).catch(function () {});
  }

  function trackToolResult(toolType, resultType) {
    if (!toolType || toolResultTracked[toolType]) return;
    toolResultTracked[toolType] = true;
    capture("tool_result_viewed", {
      tool_type: toolType,
      result_type: resultType || "rendered",
    });
  }

  function trackInitialPage() {
    var toolType = getToolType(window.location.pathname);

    capture("page_viewed");

    if (toolType) {
      capture("tool_started", { tool_type: toolType });
    }

    if (toolType === "archeometer_visual") {
      trackToolResult(toolType, "visual_rendered");
    }
  }

  function trackEngagement(type) {
    if (engagementTracked) return;
    engagementTracked = true;
    capture("page_engaged", { engagement_type: type });
  }

  function listenForEngagement() {
    window.setTimeout(function () {
      trackEngagement("time_on_page");
    }, 45000);

    window.addEventListener(
      "scroll",
      function () {
        var scrollTop = window.scrollY || document.documentElement.scrollTop;
        var viewport = window.innerHeight || document.documentElement.clientHeight;
        var fullHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

        if ((scrollTop + viewport) / fullHeight >= 0.7) {
          trackEngagement("scroll_depth");
        }
      },
      { passive: true },
    );
  }

  function getOutboundDomain(anchor) {
    try {
      var url = new URL(anchor.href);
      if (url.hostname === window.location.hostname) return null;
      return url.hostname.replace(/^www\./, "");
    } catch (_error) {
      return null;
    }
  }

  function listenForClicks() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var anchor = target.closest("a[href]");
      if (!anchor) return;

      var domain = getOutboundDomain(anchor);
      if (!domain) return;

      if (domain === "entergamu.com") {
        capture("gamu_cta_clicked", {
          outbound_domain: domain,
          cta_type: "gamu",
        });
      } else if (domain === "docs.kaabalah.com") {
        capture("kaabalah_docs_cta_clicked", {
          outbound_domain: domain,
          cta_type: "docs",
        });
      } else if (domain === "github.com") {
        capture("github_cta_clicked", {
          outbound_domain: domain,
          cta_type: "source",
        });
      }
    });
  }

  window.addEventListener("archeometer:analytics", function (event) {
    var detail = event.detail || {};
    if (detail.event === "tool_result_viewed") {
      trackToolResult(detail.tool_type, detail.result_type);
      return;
    }

    if (detail.event === "tool_started") {
      capture("tool_started", { tool_type: detail.tool_type });
    }
  });

  trackInitialPage();
  listenForEngagement();
  listenForClicks();
})();
