import { readdir, readFile, mkdir, rm, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";
import { parse } from "yaml";

const root = process.cwd();
const outputDir = path.join(root, "dist");
const postsDir = path.join(root, "_posts");
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) {
      throw new Error(`No value provided for template placeholder: ${key}`);
    }
    return values[key];
  });
}

function normalizeDate(value, filename) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid or missing date in ${filename}`);
  }
  return {
    iso: date.toISOString().slice(0, 10),
    display: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
    short: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
}

function getSlug(filename) {
  return path.basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

const [defaultLayout, postLayout, homeTemplate, postFiles] = await Promise.all([
  readFile(path.join(root, "_layouts", "default.html"), "utf8"),
  readFile(path.join(root, "_layouts", "post.html"), "utf8"),
  readFile(path.join(root, "index.html"), "utf8"),
  readdir(postsDir),
]);

const posts = await Promise.all(
  postFiles
    .filter((filename) => filename.endsWith(".md"))
    .map(async (filename) => {
      const source = await readFile(path.join(postsDir, filename), "utf8");
      const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
      if (!frontmatter) {
        throw new Error(`Missing YAML frontmatter: ${filename}`);
      }
      const data = parse(frontmatter[1]);
      const content = source.slice(frontmatter[0].length);
      if (!data.title || !data.category || !data.date) {
        throw new Error(`Post must include title, category, and date: ${filename}`);
      }
      const tags = Array.isArray(data.tags) ? data.tags : [];
      return {
        filename,
        slug: getSlug(filename),
        title: String(data.title),
        category: String(data.category),
        excerpt: String(data.excerpt ?? ""),
        tags,
        date: normalizeDate(data.date, filename),
        content: markdown.render(content),
      };
    }),
);

posts.sort((a, b) => b.date.iso.localeCompare(a.date.iso));
const slugs = new Set();
for (const post of posts) {
  if (slugs.has(post.slug)) {
    throw new Error(`Duplicate post URL slug: ${post.slug}`);
  }
  slugs.add(post.slug);
}

const postCards = posts
  .map((post) => {
    const tags = post.tags
      .slice(0, 3)
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
    return `        <article class="post-card">
          <p class="post-meta"><span>${escapeHtml(post.category)}</span><time datetime="${post.date.iso}">${post.date.short}</time></p>
          <h3><a href="posts/${encodeURIComponent(post.slug)}/">${escapeHtml(post.title)}</a></h3>
          <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="card-bottom">
            <div class="tag-list">${tags}</div>
            <a class="read-link" href="posts/${encodeURIComponent(post.slug)}/" aria-label="Read ${escapeHtml(post.title)}">Read article <span aria-hidden="true">↗</span></a>
          </div>
        </article>`;
  })
  .join("\n");

const pageDescription = "Notes on building software, design, and learning in public.";
const homeContent = fillTemplate(homeTemplate, {
  postCount: String(posts.length),
  posts: postCards,
});
const homePage = fillTemplate(defaultLayout, {
  title: "Home",
  description: pageDescription,
  themeScript: "assets/js/theme.js",
  stylesheet: "assets/css/style.css",
  content: homeContent,
});

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, "assets", "css"), { recursive: true });
await mkdir(path.join(outputDir, "assets", "js"), { recursive: true });
await mkdir(path.join(outputDir, "posts"), { recursive: true });
await copyFile(
  path.join(root, "assets", "logo.png"),
  path.join(outputDir, "assets", "logo.png"),
);
await copyFile(
  path.join(root, "assets", "css", "style.css"),
  path.join(outputDir, "assets", "css", "style.css"),
);
await copyFile(
  path.join(root, "assets", "js", "theme.js"),
  path.join(outputDir, "assets", "js", "theme.js"),
);
await writeFile(path.join(outputDir, "index.html"), homePage);

for (const post of posts) {
  const postContent = fillTemplate(postLayout, {
    category: escapeHtml(post.category),
    date: post.date.display,
    dateIso: post.date.iso,
    title: escapeHtml(post.title),
    excerpt: escapeHtml(post.excerpt),
    content: post.content,
    tags: post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("\n      "),
  });
  const page = fillTemplate(defaultLayout, {
    title: escapeHtml(post.title),
    description: escapeHtml(post.excerpt || pageDescription),
    themeScript: "../../assets/js/theme.js",
    stylesheet: "../../assets/css/style.css",
    content: postContent,
  });
  const postOutputDir = path.join(outputDir, "posts", post.slug);
  await mkdir(postOutputDir, { recursive: true });
  await writeFile(path.join(postOutputDir, "index.html"), page);
}

console.log(`Built ${posts.length} Markdown posts into dist/`);
