import fs from "fs";
import * as cheerio from "cheerio";
import TextToSVG from "text-to-svg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://yqgqoxgykswytoswqpkj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fontRegular = TextToSVG.loadSync(path.join(process.cwd(), "public/fonts/Inter.ttf"));
const fontBold = TextToSVG.loadSync(path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"));
const fontExtraBold = TextToSVG.loadSync(path.join(process.cwd(), "public/fonts/Inter-ExtraBold.ttf"));

function pickFontById(id) {
  if (["username", "current_streak", "best_streak", "text9", "text74", "text9-9", "text73"].includes(id)) {
    return fontBold;
  }
  if (["total_score", "avg_acc", "rank", "plays", "top1", "top"].includes(id)) {
    return fontExtraBold;
  }
  return fontRegular;
}

async function callRpc(name, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Supabase RPC failed: ${res.statusText}`);
  return res.json();
}

function adjustFontSizePx(text, maxChars, basePx) {
  if (!text) return basePx;
  return text.length > maxChars ? (basePx * maxChars) / text.length : basePx;
}

function getCharacterOffset(text, baseChars, offsetPerChar) {
  if (!text) return 0;
  const extraChars = Math.max(0, text.length - baseChars);
  return extraChars * offsetPerChar;
}

const pct = (v) => (typeof v === "number" ? v.toFixed(2) + "%" : "-");

function parseStyle(styleAttr = "") {
  const out = {};
  (styleAttr || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((decl) => {
      const idx = decl.indexOf(":");
      if (idx > -1) {
        const k = decl.slice(0, idx).trim();
        const v = decl.slice(idx + 1).trim();
        out[k] = v;
      }
    });
  return out;
}

function mergedStyle(textStyle, tspanStyle) {
  return { ...textStyle, ...tspanStyle };
}

function coordsFor($node, $parent) {
  const x = parseFloat($node.attr("x") ?? $parent.attr("x") ?? "0");
  const y = parseFloat($node.attr("y") ?? $parent.attr("y") ?? "0");
  return { x, y };
}

function xWithAnchor(x, anchor, width) {
  if (anchor === "middle") return x - width / 2;
  if (anchor === "end") return x - width;
  return x;
}

const dynamicOffsets = {};

function convertAllTextToPaths($, variant = "main") {
  $("text").each((_, el) => {
    const $text = $(el);
    const textStyle = parseStyle($text.attr("style"));
    const textAnchor = ($text.attr("text-anchor") || textStyle["text-anchor"] || "start").trim();
    const $group = $("<g/>");
    if ($text.attr("id")) $group.attr("id", $text.attr("id"));
    if ($text.attr("transform")) $group.attr("transform", $text.attr("transform"));

    const tspans = $text.children("tspan");
    const targets = tspans.length ? tspans.toArray() : [el];

    targets.forEach((node) => {
      const $node = $(node);
      const nodeStyle = parseStyle($node.attr("style"));
      const st = mergedStyle(textStyle, nodeStyle);

      const textContent = (tspans.length ? $node.text() : $text.text()) ?? "";
      if (!textContent) return;

      const fontSize = parseFloat(st["font-size"] || "16");
      let { x, y } = coordsFor($node, $text);
      y += 1.2;

      const id = $text.attr("id") || "";
      const font = pickFontById(id) || fontRegular;
      switch (id) {
        case "username":
          x -= 0.6;
          y -= 0.2;
          x += dynamicOffsets.username || 0;
          break;
        case "current_streak":
          x += 3.1;
          y += 3;
          if (variant === "mini") {
            x += 2;
          }
          x += dynamicOffsets.current_streak || 0;
          break;
        case "best_streak":
          x += 3.3;
          y += 3;
          if (variant === "mini") {
            x += 2.2;
          }
          x += dynamicOffsets.best_streak || 0;
          break;
        case "text9":
          x += 0.1;
		  if (variant === "mini") {
            x += 2;
		  }
          break;
        case "text74":
          x += 0.1;
		  if (variant === "mini") {
            x += 2;
		  }
          break;
        case "text9-9":
          x += 0.7;
		  if (variant === "mini") {
            x += 2;
		  }
          break;
        case "text73":
          x += 0.7;
		  if (variant === "mini") {
            x += 2;
		  }
          break;
      }

      const metrics = font.getMetrics(textContent, { fontSize });
      const width = metrics.width || 0;
      const topY = y - (metrics.ascender || 0);
      const startX = xWithAnchor(x, textAnchor, width);
      const d = font.getD(textContent, {
        x: startX,
        y: topY,
        fontSize,
      });

      const $path = $("<path/>").attr("d", d);
      if (st.fill) $path.attr("fill", st.fill);
      else $path.attr("fill", "black");
      if (st["fill-opacity"]) $path.attr("fill-opacity", st["fill-opacity"]);
      if (st.stroke) $path.attr("stroke", st.stroke);
      if (st["stroke-opacity"]) $path.attr("stroke-opacity", st["stroke-opacity"]);
      if (st["stroke-width"]) $path.attr("stroke-width", st["stroke-width"]);
      if (st["stroke-linecap"]) $path.attr("stroke-linecap", st["stroke-linecap"]);
      if (st["stroke-linejoin"]) $path.attr("stroke-linejoin", st["stroke-linejoin"]);
      if (st["paint-order"]) $path.attr("paint-order", st["paint-order"]);

      $group.append($path);
    });

    $text.replaceWith($group);
  });
}

async function generateSvgGeneric(svgFile, profile, stats, streaks, leaderboard, variant = "main") {
  const svg = fs.readFileSync(svgFile, "utf8");
  const $ = cheerio.load(svg, { xmlMode: true });

  const me = Array.isArray(leaderboard)
    ? leaderboard.find((r) => r && (r.is_target_user || r.is_target_user === true)) || {}
    : {};

  const $nameSpan = $("#username tspan");
  if ($nameSpan.length) {
    const username = profile?.username ?? "name";
    const basePx = parseFloat(parseStyle($nameSpan.attr("style"))["font-size"] || "16");
    const newPx = adjustFontSizePx(username, 11, basePx);
    $nameSpan.text(username);
    const ns = parseStyle($nameSpan.attr("style"));
    ns["font-size"] = `${newPx}px`;
    const styleStr = Object.entries(ns)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    $nameSpan.attr("style", styleStr);
    if ($nameSpan.length !== 3) {
      dynamicOffsets.username = getCharacterOffset(username, username.length / 2, -0.67);
    } else if (username.length > 10); {
      dynamicOffsets.username = getCharacterOffset(username, username.length / 2, -0.5);
    }
    
  }

  const currentStreakText = String(streaks?.currentStreak ?? "-");
  dynamicOffsets.current_streak = getCharacterOffset(currentStreakText, 1, -1.1);

  const bestStreakText = String(streaks?.longestStreak ?? "-");
  dynamicOffsets.best_streak = getCharacterOffset(bestStreakText, 1, -1.3);

  if ($("#pfp").length) {
    async function getOsuAvatar(osuUsername) {
	  try {
		const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({
			client_id: process.env.OSU_CLIENT_ID,
			client_secret: process.env.OSU_CLIENT_SECRET,
			grant_type: "client_credentials",
			scope: "public",
		  }),
		});
		if (!tokenRes.ok) throw new Error("Failed to get OAuth token");
		const tokenData = await tokenRes.json();
		const accessToken = tokenData.access_token;

		const userRes = await fetch(`https://osu.ppy.sh/api/v2/users/${osuUsername}/osu`, {
		  headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!userRes.ok) throw new Error("Failed to fetch osu user");
		const userData = await userRes.json();

		const avatarUrl = userData.avatar_url;

		const imgRes = await fetch(avatarUrl);
		if (!imgRes.ok) throw new Error("Failed to fetch avatar image");
		const arrayBuffer = await imgRes.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const contentType = imgRes.headers.get("content-type") || "image/png";

		const base64 = buffer.toString("base64");
		return `data:${contentType};base64,${base64}`;
	  } catch (err) {
		console.error("Failed to fetch osu avatar:", err.message);

		try {
		  const fallbackRes = await fetch("https://paraliyzed.net/img/lara.png");
		  const arrBuf = await fallbackRes.arrayBuffer();
		  const buf = Buffer.from(arrBuf);
		  const base64 = buf.toString("base64");
		  return `data:image/png;base64,${base64}`;
		} catch {
		  return null;
		}
	  }
	}

    const osuAvatar = await getOsuAvatar(profile?.username);
    if (osuAvatar) {
      $("#pfp").attr("xlink:href", osuAvatar);
    }
  }

  const setText = (sel, val) => {
    const $t = $(`${sel} tspan`);
    if ($t.length) $t.text(val);
  };
  setText("#total_score", stats?.totalScorePoints ?? "-");
  setText("#avg_acc", pct(me.average_accuracy));
  setText("#rank", me.position ?? "-");
  setText("#plays", stats?.totalScores ?? "-");
  setText("#top1", stats?.firstPlaceCount ?? "-");
  setText("#top", pct(100 - (me.percentile ?? 0)));
  setText("#current_streak", currentStreakText);
  setText("#best_streak", bestStreakText);
  convertAllTextToPaths($, variant);

  return $.xml();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const osuId = req.query.id;
    const option = req.query.option || "main";

    if (!osuId) {
      return res.status(400).send("osu ID is required");
    }

    const rawInt = await callRpc("get_user_id_from_osu_id", { p_osu_id: osuId });
    const internalId =
      typeof rawInt === "number"
        ? rawInt
        : Array.isArray(rawInt)
        ? rawInt.find((v) => typeof v === "number")
        : rawInt && typeof rawInt === "object"
        ? Object.values(rawInt).find((v) => typeof v === "number")
        : null;

    if (!internalId) {
      return res.status(404).send("User not found");
    }

    const profileRes = await fetch(
      `https://www.challengersnexus.com/api/user/profile/${internalId}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!profileRes.ok) {
      const errorText = await profileRes.text();
      console.error('Profile fetch failed:', profileRes.status, errorText);
      throw new Error(`Failed to fetch profile: ${profileRes.status}`);
    }

    const profileData = await profileRes.json();
    
    if (!profileData || !profileData.success || !profileData.data) {
      console.error('Invalid profile data structure:', profileData);
      throw new Error('Invalid profile data received');
    }

    const profile = profileData.data.user;
    const stats = profileData.data.stats;
    const streaks = profileData.data.streaks;

    if (!profile || !profile.username) {
      console.error('Profile missing required fields:', profile);
      throw new Error('Profile data incomplete');
    }

    const SEASON_ID = await callRpc("get_current_season_id", {});
    const leaderboard = await callRpc("get_season_leaderboard_with_user", {
      user_id_param: internalId,
      season_id_param: SEASON_ID,
    });

    const templateFile = path.join(process.cwd(), "public/card-templates/", option === "mini" ? "mini.svg" : "main.svg");

    const outSvg = await generateSvgGeneric(
	  templateFile,
	  profile,
	  stats,
	  streaks,
	  leaderboard,
	  option
	);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(outSvg);
  } catch (err) {
    console.error('Card API error:', err.message);
    if (err.stack) {
      console.error('Stack trace:', err.stack);
    }
    res.status(500).send("Error: " + err.message);
  }
}