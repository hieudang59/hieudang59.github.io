# Field Notes

A static blog with HTML templates, CSS styling, and Markdown post content. It does not use Jekyll and needs no JavaScript in the published site. A small Node.js build script converts Markdown into static HTML before publishing.

## Build

Install [Node.js](https://nodejs.org/), then run:

```sh
npm install
npm run build
```

The generated website is written to `dist/`. Open `dist/index.html` in a browser or publish the contents of `dist/` to a static web host.

## Preview locally

Run `npm run dev` to build the site and serve the generated `dist/` folder at `http://localhost:3000`. Use this instead of serving the project source folder, so article links load their generated pages and stylesheets correctly.

## Add a post

Create a dated Markdown file in `_posts/`, for example `_posts/2026-10-22-my-new-post.md`:

```markdown
---
title: "My New Post"
date: 2026-10-22
category: Notes
excerpt: "A short summary shown on the homepage."
tags: [Writing, Ideas]
---

Your post content goes here. Use normal Markdown headings, lists, links, and code blocks.
```

Run `npm run build` again to update the published pages. Edit `index.html` to customize the homepage introduction, `_layouts/` for HTML layout, and `assets/css/style.css` for the design.
