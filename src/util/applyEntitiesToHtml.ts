import { ApiMessageEntity, ApiMessageEntityTypes } from "../api/types";

function escapeHtml(text: string): string {
  var result = "";
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    switch (char) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#039;";
        break;
      default:
        result += char;
    }
  }
  return result;
}

// Получение типа тега для ApiMessageEntityTypes
function getTagType(entity: ApiMessageEntity): string | undefined {
  switch (entity.type) {
    case ApiMessageEntityTypes.Bold:
      return "b";
    case ApiMessageEntityTypes.Italic:
      return "i";
    case ApiMessageEntityTypes.Underline:
      return "u";
    case ApiMessageEntityTypes.Strike:
      return "s";
    case ApiMessageEntityTypes.Code:
      return "code";
    case ApiMessageEntityTypes.Pre:
      return "pre";
    case ApiMessageEntityTypes.Blockquote:
      return "blockquote";
    case ApiMessageEntityTypes.TextUrl:
      return "a";
    case ApiMessageEntityTypes.Spoiler:
      return "span";
    default:
      return undefined;
  }
}

function applyAttributes(entity: ApiMessageEntity): string | undefined {
  switch (entity.type) {
    case ApiMessageEntityTypes.TextUrl:
      return `href="${escapeHtml(entity.url!)}"`;
    case ApiMessageEntityTypes.Spoiler:
      return 'data-entity-type="spoiler"';
    case ApiMessageEntityTypes.Pre:
      return entity.language
        ? `data-language="${escapeHtml(entity.language)}"`
        : undefined;
    default:
      return undefined;
  }
}

interface Tags {
  text: string;
  position: number;
}
export function applyEntitiesToHtml(
  text: string,
  entities: ApiMessageEntity[] | undefined
): string {
  if (!text) {
    return "";
  }

  if (!entities || entities.length === 0) {
    return escapeHtml(text);
  }

  var html = escapeHtml(text);

  var tags: Tags[] = new Array(entities.length * 2);

  for (var i = 0; i < entities.length; i++) {
    var { offset, length } = entities[i];
    var entityEnd = offset + length;
    var tag = getTagType(entities[i]);
    var attributes = applyAttributes(entities[i]);

    tags[i * 2] = {
      position: offset,
      text: `<${tag}${attributes ? " " + attributes : ""}>`,
    };
    tags[i * 2 + 1] = { position: offset + length, text: `</${tag}>` };
  }
  var sortedTags = [...tags].sort((a, b) => b.position - a.position);

  sortedTags.forEach((tag) => {
    var start = html.substring(0, tag.position);
    var end = html.substring(tag.position);
    html = start + tag.text + end;
  });
  console.log(html);
  return html;
}
