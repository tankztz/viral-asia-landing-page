import archive from "../data/sgdailyCatchupManifest.json" with { type: "json" };

function postCode(value) {
  if (!URL.canParse(value)) return;
  const url = new URL(value);
  if (
    !/^https?:$/.test(url.protocol) ||
    !/^(?:www\.|m\.)?instagram\.com$/.test(url.hostname)
  )
    return;
  return url.pathname.match(
    /^\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]+)(?:\/embed(?:\/captioned)?)?\/?$/,
  )?.[1];
}

const archiveByCode = new Map(
  archive.articles.map((entry) => [postCode(entry.sourceUrl), entry]),
);
const credit = (key, text) => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", text, marks: [] }],
});

// Render from the build snapshot and verified archive only. Instagram frame
// load events cannot distinguish a working post from an error page.
export function articleBody(post) {
  const body = Array.isArray(post.body) ? post.body : [];
  const hero = post.mainImage?.asset?._id;
  const usedAssets = new Set([hero]);
  const picturedCodes = new Set();
  for (const node of body) {
    if (node?._type === "image" && node.asset?._ref) {
      usedAssets.add(node.asset._ref);
      picturedCodes.add(postCode(node.sourceUrl));
    }
  }

  function withArchiveImage(code, block) {
    const entry = code && archiveByCode.get(code);
    if (
      !entry?.imageAssetId ||
      picturedCodes.has(code) ||
      usedAssets.has(entry.imageAssetId)
    )
      return [block];
    usedAssets.add(entry.imageAssetId);
    return [
      {
        _type: "image",
        _key: `${block._key}-archive`,
        asset: { _type: "reference", _ref: entry.imageAssetId },
        alt: entry.title,
      },
      block,
    ];
  }

  return body.flatMap((node) => {
    if (
      node?._type === "socialEmbed" &&
      (!node.platform || node.platform === "instagram")
    ) {
      return withArchiveImage(
        postCode(node.url),
        credit(node._key, node.caption || "Source: Instagram"),
      );
    }
    if (node?._type === "image" && postCode(node.sourceUrl)) {
      if (hero && node.asset?._ref === hero) {
        const label = [node.caption, node.sourceLabel]
          .filter(Boolean)
          .join(" · ");
        return label ? [credit(node._key, label)] : [];
      }
      return [{ ...node, sourceUrl: undefined }];
    }
    if (node?._type !== "block" || !Array.isArray(node.children)) return [node];
    const links = (node.markDefs || []).filter(
      (mark) => mark._type === "link" && postCode(mark.href),
    );
    if (!links.length) return [node];
    const keys = new Set(links.map((mark) => mark._key));
    const block = {
      ...node,
      markDefs: node.markDefs.filter((mark) => !keys.has(mark._key)),
      children: node.children.map((child) =>
        child.marks?.some((key) => keys.has(key))
          ? { ...child, marks: child.marks.filter((key) => !keys.has(key)) }
          : child,
      ),
    };
    // Only a dedicated source line gets an image; never interrupt linked prose.
    const isSourceLine =
      links.length === 1 &&
      node.children.some((child) => child.marks?.includes(links[0]._key)) &&
      node.children.every(
        (child) =>
          child._type === "span" &&
          (child.marks?.includes(links[0]._key) ||
            /^(?:source\s*:)?$/i.test(child.text.trim())),
      );
    return isSourceLine
      ? withArchiveImage(postCode(links[0].href), block)
      : [block];
  });
}
