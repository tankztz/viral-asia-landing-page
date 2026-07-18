import { defineArrayMember, defineType } from "sanity";

export default defineType({
  title: "Block Content",
  name: "blockContent",
  type: "array",
  of: [
    defineArrayMember({
      title: "Block",
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [{ title: "Bullet", value: "bullet" }],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
        annotations: [
          {
            title: "URL",
            name: "link",
            type: "object",
            fields: [
              {
                title: "URL",
                name: "href",
                type: "url",
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: "image",
      title: "Image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Describe the image for accessibility and SEO.",
        },
        {
          name: "caption",
          title: "Caption",
          type: "string",
        },
        {
          name: "sourceLabel",
          title: "Source label",
          type: "string",
          description: "Example: Photo via Facebook, Google Maps, or Viral Asia.",
        },
        {
          name: "sourceUrl",
          title: "Source URL",
          type: "url",
        },
      ],
    }),
    defineArrayMember({
      name: "socialEmbed",
      title: "Social embed",
      type: "object",
      fields: [
        {
          name: "platform",
          title: "Platform",
          type: "string",
          options: {
            list: [
              { title: "Instagram", value: "instagram" },
              { title: "TikTok", value: "tiktok" },
              { title: "YouTube", value: "youtube" },
            ],
            layout: "radio",
          },
          validation: (Rule) => Rule.required(),
        },
        {
          name: "url",
          title: "Post URL",
          type: "url",
          validation: (Rule) => Rule.required(),
        },
        {
          name: "caption",
          title: "Caption",
          type: "string",
          description: "Optional source label shown under the embed.",
        },
      ],
      preview: {
        select: {
          platform: "platform",
          url: "url",
          caption: "caption",
        },
        prepare({ platform, url, caption }) {
          return {
            title: caption || `${platform || "Social"} embed`,
            subtitle: url,
          };
        },
      },
    }),
  ],
});
