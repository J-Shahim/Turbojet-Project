import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

export default function NotebookMarkdown({ content }) {
  if (!content) {
    return null;
  }

  const resolveImageSrc = (src) => {
    if (!src || typeof src !== "string") {
      return src;
    }
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      return src;
    }
    if (src.startsWith("/")) {
      const baseUrl = import.meta.env.BASE_URL || "/";
      return baseUrl.replace(/\/+$/, "") + src;
    }
    return src;
  };

  const paragraphHasImage = (node) => {
    if (!node || !Array.isArray(node.children)) {
      return false;
    }
    return node.children.some((child) => {
      if (!child) {
        return false;
      }
      if (child.tagName === "img" || child.tagName === "figure") {
        return true;
      }
      return child.type === "image" || child.type === "element";
    });
  };

  const components = {
    img: ({ src, alt, title, ...rest }) => {
      const caption = (alt || title || "").trim();
      const resolvedSrc = resolveImageSrc(src);
      return (
        <figure className="analysis-figure">
          <img src={resolvedSrc} alt={alt || ""} title={title} {...rest} />
          {caption ? <figcaption className="analysis-figcaption">{caption}</figcaption> : null}
        </figure>
      );
    },
    p: ({ node, children, ...rest }) => {
      if (paragraphHasImage(node)) {
        return <div className="analysis-paragraph">{children}</div>;
      }
      return <p {...rest}>{children}</p>;
    }
  };

  return (
    <div className="analysis-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore", throwOnError: false }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
