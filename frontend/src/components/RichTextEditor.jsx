import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Quote,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react";
import "./RichTextEditor.css";

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "pkb-editor-content",
        spellcheck: "true",
        "aria-label": "Note content editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentContent = editor.getHTML();
    const incomingContent = value || "";

    if (currentContent !== incomingContent) {
      editor.commands.setContent(incomingContent, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  const addLink = () => {
    if (!editor) return;

    const existingUrl = editor.getAttributes("link").href || "";
    const input = window.prompt("Enter the website URL", existingUrl);

    if (input === null) return;

    const url = input.trim();

    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    let normalizedUrl = url;

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".")
      ) {
        throw new Error("Invalid URL");
      }

      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalizedUrl })
        .run();
    } catch {
      window.alert("Please enter a valid website URL.");
    }
  };

  const toolbarButton = ({
    label,
    icon,
    active = false,
    disabled = false,
    onClick,
  }) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`pkb-editor-tool ${active ? "active" : ""}`}
      disabled={!editor || disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  if (!editor) {
    return (
      <div className="pkb-editor-loading">
        Preparing editor...
      </div>
    );
  }

  return (
    <div className="pkb-rich-editor">
      <div className="pkb-editor-toolbar">
        {toolbarButton({
          label: "Bold",
          icon: <Bold size={17} />,
          active: editor.isActive("bold"),
          onClick: () => editor.chain().focus().toggleBold().run(),
        })}

        {toolbarButton({
          label: "Italic",
          icon: <Italic size={17} />,
          active: editor.isActive("italic"),
          onClick: () => editor.chain().focus().toggleItalic().run(),
        })}

        {toolbarButton({
          label: "Underline",
          icon: <UnderlineIcon size={17} />,
          active: editor.isActive("underline"),
          onClick: () => editor.chain().focus().toggleUnderline().run(),
        })}

        <span className="pkb-editor-divider" />

        {toolbarButton({
          label: "Heading 1",
          icon: <Heading1 size={18} />,
          active: editor.isActive("heading", { level: 1 }),
          onClick: () =>
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
        })}

        {toolbarButton({
          label: "Heading 2",
          icon: <Heading2 size={18} />,
          active: editor.isActive("heading", { level: 2 }),
          onClick: () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
        })}

        <span className="pkb-editor-divider" />

        {toolbarButton({
          label: "Bullet list",
          icon: <List size={18} />,
          active: editor.isActive("bulletList"),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        })}

        {toolbarButton({
          label: "Numbered list",
          icon: <ListOrdered size={18} />,
          active: editor.isActive("orderedList"),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        })}

        {toolbarButton({
          label: "Quote",
          icon: <Quote size={17} />,
          active: editor.isActive("blockquote"),
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
        })}

        <span className="pkb-editor-divider" />

        {toolbarButton({
          label: "Add link",
          icon: <LinkIcon size={17} />,
          active: editor.isActive("link"),
          onClick: addLink,
        })}

        {toolbarButton({
          label: "Remove link",
          icon: <Unlink size={17} />,
          disabled: !editor.isActive("link"),
          onClick: () =>
            editor.chain().focus().extendMarkRange("link").unsetLink().run(),
        })}

        <span className="pkb-editor-divider" />

        {toolbarButton({
          label: "Undo",
          icon: <Undo2 size={17} />,
          onClick: () => editor.chain().focus().undo().run(),
        })}

        {toolbarButton({
          label: "Redo",
          icon: <Redo2 size={17} />,
          onClick: () => editor.chain().focus().redo().run(),
        })}

        {toolbarButton({
          label: "Clear formatting",
          icon: <Eraser size={17} />,
          onClick: () =>
            editor.chain().focus().unsetAllMarks().clearNodes().run(),
        })}
      </div>

      <EditorContent editor={editor} />

      <div className="pkb-editor-footer">
        <span>Rich text</span>
        <span>Formatting is saved with your note</span>
      </div>
    </div>
  );
}