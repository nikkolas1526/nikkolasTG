interface AstNode {
  type: "marker" | "messageText";
  content: string;
  position?: number;
}
import { ApiMessageEntityTypes } from "../api/types/messages";

import type { ApiFormattedText, ApiMessageEntity } from "../api/types";

export const ENTITY_CLASS_BY_NODE_NAME: Record<string, ApiMessageEntityTypes> =
  {
    B: ApiMessageEntityTypes.Bold,
    STRONG: ApiMessageEntityTypes.Bold,
    I: ApiMessageEntityTypes.Italic,
    EM: ApiMessageEntityTypes.Italic,
    INS: ApiMessageEntityTypes.Underline,
    U: ApiMessageEntityTypes.Underline,
    S: ApiMessageEntityTypes.Strike,
    STRIKE: ApiMessageEntityTypes.Strike,
    DEL: ApiMessageEntityTypes.Strike,
    CODE: ApiMessageEntityTypes.Code,
    PRE: ApiMessageEntityTypes.Pre,
    BLOCKQUOTE: ApiMessageEntityTypes.Blockquote,
  };

function parseHtmlToAst(html: string) {
  const nodes: AstNode[] = [];
  var messageText = html;

  let i = 0;
  while (i < html.length) {
    if (messageText.indexOf("<", i) > -1) {
      i = messageText.indexOf("<", i);
      const tagEnd = messageText.indexOf(">", i);
      var tagText = messageText.substring(i, tagEnd + 1);

      if (tagText.startsWith("<strong")) {
        tagText = tagText.replace("<strong", "<b");
      }
      if (tagText.startsWith("</strong>")) {
        tagText = tagText.replace("</strong>", "</b>");
      }
      if (tagText.startsWith("<em")) {
        tagText = tagText.replace("<em", "<i");
      }
      if (tagText.startsWith("</em")) {
        tagText = tagText.replace("</em", "</i");
      }
      if (tagText.startsWith("<ins")) {
        tagText = tagText.replace("<ins", "<u");
      }
      if (tagText.startsWith("</ins")) {
        tagText = tagText.replace("</ins", "</u");
      }
      if (tagText.startsWith("<strike")) {
        tagText = tagText.replace("<strike", "<s");
      }
      if (tagText.startsWith("</strike")) {
        tagText = tagText.replace("</strike", "</s");
      }
      if (tagText.startsWith("<del")) {
        tagText = tagText.replace("<del", "<s");
      }
      if (tagText.startsWith("</del")) {
        tagText = tagText.replace("</del", "</s");
      }
      if (tagText.startsWith("<ins")) {
        tagText = tagText.replace("<ins", "<u");
      }
      if (tagText.startsWith("</ins")) {
        tagText = tagText.replace("</ins", "</u");
      }

      if (!(tagText in pairs)) {
        var openingTag = Object.keys(pairs).find(
          (key) => pairs[key] === tagText
        );
      }
      var checkErrorCase = nodes.findIndex(
        (node) =>
          node.type === "marker" &&
          node.content === pairs[tagText] &&
          node.position === i
      );
      if (checkErrorCase == -1) {
        checkErrorCase = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === openingTag &&
            node.position === i
        );
      }

      if (checkErrorCase > -1) {
        var start = messageText.substring(0, i);
        var end = messageText.substring(tagEnd + 1);

        messageText = start + end;
        nodes.splice(checkErrorCase, 1);
      } else {
        nodes.push({ type: "marker", content: tagText, position: i });
        var start = messageText.substring(0, i);
        var end = messageText.substring(tagEnd + 1);

        messageText = start + end;
      }
    } else {
      break;
    }
  }

  nodes.push({ type: "messageText", content: messageText });

  return nodes;
}

function transformAst(
  ast: AstNode[],
  withMarkdownLinks: boolean,
  skipMarkdown: boolean,
  cursor?: { value: number },
  setActiveStyle?: { value: boolean }
): AstNode[] {
  if (skipMarkdown) return ast;
  let transformedAst = ast;
  if (cursor) {
    transformedAst = transformCommonMarkdownReplacements(
      transformedAst,
      cursor,
      setActiveStyle
    );
  } else {
    transformedAst = transformCommonMarkdownReplacements(transformedAst);
  }
  return transformedAst;
}

function transformCommonMarkdownReplacements(
  ast: AstNode[],
  cursor?: { value: number },
  setActiveStyle?: { value: boolean }
) {
  var text = ast.filter((a) => a.type == "messageText")[0].content;
  console.log(ast);

  function processText(content: string) {
    const nodes: AstNode[] = ast
      .map((el) => (el.type === "marker" ? el : null))
      .filter((el): el is AstNode => el !== null);
    let currentIndex = 0;
    var newText = content;

    while (currentIndex < content.length) {
      const boldStart = newText.indexOf("**", currentIndex);
      const italicStart = newText.indexOf("__", currentIndex);
      const strikeStart = newText.indexOf("~~", currentIndex);
      const spoilerStart = newText.indexOf("||", currentIndex);
      const preStart = newText.indexOf("```", currentIndex);
      const codeStart = newText.indexOf("`", currentIndex);

      const nextMarker = Math.min(
        boldStart === -1 ? Infinity : boldStart,
        italicStart === -1 ? Infinity : italicStart,
        strikeStart === -1 ? Infinity : strikeStart,
        spoilerStart === -1 ? Infinity : spoilerStart,
        codeStart === -1 ? Infinity : codeStart,
        preStart === -1 ? Infinity : preStart
      );

      if (nextMarker === Infinity) {
        break;
      }

      if (nextMarker === boldStart) {
        var endBold = newText.indexOf("**", boldStart + 2);

        var boldNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "<b>" &&
            node.position === boldStart
        );

        var boldNodesWasMade2 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</b>" &&
            node.position === endBold + 2
        );

        if (boldNodesWasMade > -1 && boldNodesWasMade2 == -1) {
          var endBold2 = newText.indexOf("***", boldStart + 2);

          if (endBold2 == endBold && endBold != -1) {
            endBold2 = newText.indexOf("****", boldStart + 2);
            if (endBold2 == endBold) {
              newText =
                newText.substring(0, endBold) + newText.substring(endBold + 2);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endBold + 2) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
            endBold++;
          } else {
            if (endBold !== -1) {
              newText =
                newText.substring(0, endBold) + newText.substring(endBold + 2);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endBold + 2) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
          }
        }

        if (endBold !== -1) {
          if (boldNodesWasMade == -1 && boldNodesWasMade2 == -1) {
            if (endBold == boldStart + 2) {
              if (cursor) {
                if (cursor.value >= endBold + 2) {
                  cursor.value -= 4;
                }
                if (cursor.value == endBold + 1) {
                  cursor.value -= 3;
                }
                if (cursor.value == endBold) {
                  cursor.value -= 2;
                }
                if (cursor.value == boldStart + 1) {
                  cursor.value -= 1;
                }
              }
              newText =
                newText.substring(0, boldStart) +
                newText.substring(boldStart + 4);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endBold + 2) {
                  obj.position -= 4;
                }
              });

              currentIndex = boldStart;
              continue;
            } else {
              nodes.push({
                type: "marker",
                content: "<b>",
                position: boldStart,
              });

              nodes.push({
                type: "marker",
                content: "</b>",
                position: endBold + 2,
              });
              if (
                cursor &&
                cursor.value >= boldStart &&
                cursor.value < endBold + 2 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }
              if (cursor && cursor.value >= endBold + 2) {
                cursor.value -= 2;
              }

              currentIndex = boldStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= boldStart &&
              cursor.value < endBold + 2 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;

              currentIndex = boldStart + 2;

              continue;
            } else {
              newText =
                newText.substring(0, boldStart) +
                newText.substring(boldStart + 2, endBold) +
                "\u200B" +
                newText.substring(endBold + 2);

              if (cursor && cursor.value >= endBold + 2) {
                cursor.value -= 3;
              }
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > boldStart) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position >= endBold) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position > endBold) {
                  obj.position += 1;
                }
              });

              currentIndex = boldStart;
              continue;
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else if (nextMarker === italicStart) {
        var endItalic = newText.indexOf("__", italicStart + 2);

        var italicNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "<i>" &&
            node.position === italicStart
        );

        var italicNodesWasMade2 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</i>" &&
            node.position === endItalic + 2
        );

        if (italicNodesWasMade > -1 && italicNodesWasMade2 == -1) {
          var endItalic2 = newText.indexOf("___", italicStart + 2);
          if (endItalic2 == endItalic && endItalic != -1) {
            endItalic2 = newText.indexOf("____", italicStart + 2);
            if (endItalic2 == endItalic) {
              newText =
                newText.substring(0, endItalic) +
                newText.substring(endItalic + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endItalic + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }

              continue;
            }
            endItalic++;
          } else {
            if (endItalic !== -1) {
              newText =
                newText.substring(0, endItalic) +
                newText.substring(endItalic + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endItalic + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
          }
        }

        if (endItalic !== -1) {
          if (italicNodesWasMade == -1 && italicNodesWasMade2 == -1) {
            if (endItalic == italicStart + 2) {
              if (cursor) {
                if (cursor.value >= endItalic + 2) {
                  cursor.value -= 4;
                }
                if (cursor.value == endItalic + 1) {
                  cursor.value -= 3;
                }
                if (cursor.value == endItalic) {
                  cursor.value -= 2;
                }
                if (cursor.value == italicStart + 1) {
                  cursor.value -= 1;
                }
              }
              newText =
                newText.substring(0, italicStart) +
                newText.substring(italicStart + 4);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endItalic + 2
                ) {
                  obj.position -= 4;
                }
              });

              currentIndex = italicStart;
              continue;
            } else {
              nodes.push({
                type: "marker",
                content: "<i>",
                position: italicStart,
              });

              nodes.push({
                type: "marker",
                content: "</i>",
                position: endItalic + 2,
              });
              if (
                cursor &&
                cursor.value >= italicStart &&
                cursor.value < endItalic + 2 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }

              if (cursor && cursor.value >= endItalic + 2) {
                cursor.value -= 2;
              }

              currentIndex = italicStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= italicStart &&
              cursor.value < endItalic + 2 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;
              console.log("TRUE");
              currentIndex = italicStart + 2;
              continue;
            } else {
              if (cursor && cursor.value >= endItalic + 2) {
                cursor.value -= 3;
              }

              newText =
                newText.substring(0, italicStart) +
                newText.substring(italicStart + 2, endItalic) +
                "\u200B" +
                newText.substring(endItalic + 2);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > italicStart) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position >= endItalic) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position > endItalic) {
                  obj.position += 1;
                }
              });

              currentIndex = italicStart;
              continue;
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else if (nextMarker === strikeStart) {
        var endStrike = newText.indexOf("~~", strikeStart + 2);

        var strikeNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "<s>" &&
            node.position === strikeStart
        );

        var strikeNodesWasMade2 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</s>" &&
            node.position === endStrike + 2
        );

        if (strikeNodesWasMade > -1 && strikeNodesWasMade2 == -1) {
          var endStrike2 = newText.indexOf("~~~", strikeStart + 2);
          if (endStrike2 == endStrike && endStrike != -1) {
            endStrike2 = newText.indexOf("~~~~", strikeStart + 2);
            if (endStrike2 == endStrike) {
              newText =
                newText.substring(0, endStrike) +
                newText.substring(endStrike + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endStrike + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
            endStrike++;
          } else {
            if (endStrike !== -1) {
              newText =
                newText.substring(0, endStrike) +
                newText.substring(endStrike + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endStrike + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
          }
        }

        if (endStrike !== -1) {
          if (strikeNodesWasMade == -1 && strikeNodesWasMade2 == -1) {
            if (endStrike == strikeStart + 2) {
              if (cursor) {
                if (cursor.value >= endStrike + 2) {
                  cursor.value -= 4;
                }
                if (cursor.value == endStrike + 1) {
                  cursor.value -= 3;
                }
                if (cursor.value == endStrike) {
                  cursor.value -= 2;
                }
                if (cursor.value == strikeStart + 1) {
                  cursor.value -= 1;
                }
              }
              newText =
                newText.substring(0, strikeStart) +
                newText.substring(strikeStart + 4);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endStrike + 2
                ) {
                  obj.position -= 4;
                }
              });

              currentIndex = strikeStart;
              continue;
            } else {
              nodes.push({
                type: "marker",
                content: "<s>",
                position: strikeStart,
              });

              nodes.push({
                type: "marker",
                content: "</s>",
                position: endStrike + 2,
              });
              if (
                cursor &&
                cursor.value >= strikeStart &&
                cursor.value < endStrike + 2 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }
              if (cursor && cursor.value >= endStrike + 2) {
                cursor.value -= 2;
              }
              currentIndex = strikeStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= strikeStart &&
              cursor.value < endStrike + 2 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;
              currentIndex = strikeStart + 2;
              continue;
            } else {
              if (cursor && cursor.value >= endStrike + 2) {
                cursor.value -= 3;
              }

              newText =
                newText.substring(0, strikeStart) +
                newText.substring(strikeStart + 2, endStrike) +
                "\u200B" +
                newText.substring(endStrike + 2);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > strikeStart) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position >= endStrike) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position > endStrike) {
                  obj.position += 1;
                }
              });

              currentIndex = strikeStart;
              continue;
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else if (nextMarker === spoilerStart) {
        var endSpoiler = newText.indexOf("||", spoilerStart + 2);

        var spoilerNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content ===
              '<span class="spoiler" data-entity-type="MessageEntitySpoiler">' &&
            node.position === spoilerStart
        );

        var spoilerNodesWasMade2 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</span>" &&
            node.position === endSpoiler + 2
        );

        if (spoilerNodesWasMade > -1 && spoilerNodesWasMade2 == -1) {
          var endSpoiler2 = newText.indexOf("|||", spoilerStart + 2);
          if (endSpoiler2 == endSpoiler && endSpoiler != -1) {
            endSpoiler2 = newText.indexOf("||||", spoilerStart + 2);
            if (endSpoiler2 == endSpoiler) {
              newText =
                newText.substring(0, endSpoiler) +
                newText.substring(endSpoiler + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endSpoiler + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
            endSpoiler++;
          } else {
            if (endSpoiler !== -1) {
              newText =
                newText.substring(0, endSpoiler) +
                newText.substring(endSpoiler + 2);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endSpoiler + 2
                ) {
                  obj.position -= 2;
                }
              });
              if (cursor) {
                cursor.value -= 2;
              }
              continue;
            }
          }
        }

        if (endSpoiler !== -1) {
          if (spoilerNodesWasMade == -1 && spoilerNodesWasMade2 == -1) {
            if (endSpoiler == spoilerStart + 2) {
              if (cursor) {
                if (cursor.value >= endSpoiler + 2) {
                  cursor.value -= 4;
                }
                if (cursor.value == endSpoiler + 1) {
                  cursor.value -= 3;
                }
                if (cursor.value == endSpoiler) {
                  cursor.value -= 2;
                }
                if (cursor.value == spoilerStart + 1) {
                  cursor.value -= 1;
                }
              }
              newText =
                newText.substring(0, spoilerStart) +
                newText.substring(spoilerStart + 4);
              nodes.forEach((obj) => {
                if (
                  obj.position !== undefined &&
                  obj.position > endSpoiler + 2
                ) {
                  obj.position -= 4;
                }
              });

              currentIndex = spoilerStart;
              continue;
            } else {
              nodes.push({
                type: "marker",
                content:
                  '<span class="spoiler" data-entity-type="MessageEntitySpoiler">',
                position: spoilerStart,
              });

              nodes.push({
                type: "marker",
                content: "</span>",
                position: endSpoiler + 2,
              });
              if (
                cursor &&
                cursor.value >= spoilerStart &&
                cursor.value < endSpoiler + 2 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }
              if (cursor && cursor.value >= endSpoiler + 2) {
                cursor.value -= 2;
              }
              currentIndex = spoilerStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= spoilerStart &&
              cursor.value < endSpoiler + 2 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;
              console.log("TRUE");
              currentIndex = spoilerStart + 2;
              continue;
            } else {
              if (cursor && cursor.value >= endSpoiler + 2) {
                cursor.value -= 3;
              }

              newText =
                newText.substring(0, spoilerStart) +
                newText.substring(spoilerStart + 2, endSpoiler) +
                "\u200B" +
                newText.substring(endSpoiler + 2);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > spoilerStart) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position >= endSpoiler) {
                  obj.position -= 2;
                }
                if (obj.position !== undefined && obj.position > endSpoiler) {
                  obj.position += 1;
                }
              });

              currentIndex = spoilerStart;

              continue;
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else if (nextMarker === preStart) {
        var endPre = newText.indexOf("```", preStart + 3);
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        console.log(JSON.stringify(cursor));
        var preNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === '<pre class="text-entity-pre">' &&
            node.position === preStart
        );

        var preNodesWasMade1 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</pre>" &&
            node.position === endPre + 3
        );

        if (preNodesWasMade > -1 && preNodesWasMade1 == -1) {
          var endPre1 = newText.indexOf("````", preStart + 3);

          if (endPre1 && endPre1 == endPre && endPre != -1) {
            if (endPre1 == endPre) {
              newText =
                newText.substring(0, endPre) + newText.substring(endPre + 3);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endPre + 3) {
                  obj.position -= 3;
                }
              });
              if (cursor) {
                cursor.value -= 3;
              }
              continue;
            }
            endPre++;
          } else {
            if (endPre !== -1) {
              newText =
                newText.substring(0, endPre) + newText.substring(endPre + 3);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endPre + 3) {
                  obj.position -= 3;
                }
              });
              if (cursor) {
                cursor.value -= 3;
              }
              continue;
            }
          }
        }

        if (endPre !== -1) {
          if (preNodesWasMade == -1 && preNodesWasMade1 == -1) {
            if (endPre == preStart + 3) {
              if (cursor) {
                if (cursor.value == preStart + 6) {
                  cursor.value -= 6;
                }
                if (cursor.value == preStart + 3) {
                  cursor.value -= 3;
                }
              }
              newText =
                newText.substring(0, preStart) +
                newText.substring(preStart + 6);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endPre + 3) {
                  obj.position -= 6;
                }
              });

              currentIndex = preStart;
              continue;
            } else {
              nodes.push({
                type: "marker",
                content: '<pre class="text-entity-pre">',
                position: preStart,
              });

              nodes.push({
                type: "marker",
                content: "</pre>",
                position: endPre + 3,
              });
              if (
                cursor &&
                cursor.value >= preStart &&
                cursor.value < endPre + 3 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }
              if (cursor && cursor.value >= endPre + 3) {
                cursor.value -= 5;
              }
              currentIndex = preStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= preStart &&
              cursor.value < endPre + 3 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;
              if (newText.startsWith("````", preStart)) {
                newText =
                  newText.substring(0, preStart) +
                  newText.substring(preStart + 1);
                nodes.forEach((el) => {
                  if (el.type == "marker" && el.position > preStart) {
                    el.position--;
                  }
                });
                if (cursor && cursor.value > preStart) {
                  cursor.value--;
                }
              }

              currentIndex = preStart + 3;
              continue;
            } else {
              if (cursor && cursor.value >= endPre + 3) {
                cursor.value -= 5;
              }
              console.log(preStart);
              if (cursor) {
                console.log(cursor.value);
              }
              if (cursor == undefined) {
                newText =
                  newText.substring(0, preStart) +
                  newText.substring(preStart + 3, endPre) +
                  "\u200B" +
                  newText.substring(endPre + 3);
                nodes.forEach((obj) => {
                  if (obj.position !== undefined && obj.position > preStart) {
                    obj.position -= 3;
                  }
                  if (obj.position !== undefined && obj.position >= endPre) {
                    obj.position -= 3;
                  }
                  if (obj.position !== undefined && obj.position > endPre) {
                    obj.position += 1;
                  }
                });

                currentIndex = preStart;
                continue;
              } else {
                if (cursor.value == endPre + 3) {
                  newText =
                    newText.substring(0, endPre + 3) +
                    "\u200B" +
                    newText.substring(endPre + 3);
                  cursor.value++;
                }
                currentIndex = preStart + 3;
                continue;
              }
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else if (nextMarker === codeStart) {
        var endCode = newText.indexOf("`", codeStart + 1);

        var codeNodesWasMade = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === '<code class="text-entity-code">' &&
            node.position === codeStart
        );

        var codeNodesWasMade1 = nodes.findIndex(
          (node) =>
            node.type === "marker" &&
            node.content === "</code>" &&
            node.position === endCode + 1
        );

        if (codeNodesWasMade > -1 && codeNodesWasMade1 == -1) {
          var endCode1 = newText.indexOf("``", codeStart + 1);

          if (endCode1 && endCode1 == endCode && endCode != -1) {
            if (endCode1 == endCode) {
              newText =
                newText.substring(0, endCode) + newText.substring(endCode + 1);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endCode + 1) {
                  obj.position -= 1;
                }
              });
              if (cursor) {
                cursor.value -= 1;
              }
              continue;
            }
            endCode++;
          } else {
            if (endCode !== -1) {
              newText =
                newText.substring(0, endCode) + newText.substring(endCode + 1);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > endCode + 1) {
                  obj.position -= 1;
                }
              });
              if (cursor) {
                cursor.value -= 1;
              }
              continue;
            }
          }
        }

        if (endCode !== -1) {
          if (codeNodesWasMade == -1 && codeNodesWasMade1 == -1) {
            if (endCode == codeStart + 1) {
              currentIndex = codeStart + 2;

              continue;
            } else {
              nodes.push({
                type: "marker",
                content: '<code class="text-entity-code">',
                position: codeStart,
              });

              nodes.push({
                type: "marker",
                content: "</code>",
                position: endCode + 1,
              });
              if (
                cursor &&
                cursor.value >= codeStart &&
                cursor.value < endCode + 1 &&
                setActiveStyle &&
                setActiveStyle.value == false
              ) {
                setActiveStyle.value = true;
              }
              if (cursor && cursor.value >= endCode + 1) {
                cursor.value -= 1;
              }
              currentIndex = codeStart;
              continue;
            }
          } else {
            if (
              cursor &&
              cursor.value >= codeStart &&
              cursor.value < endCode + 1 &&
              setActiveStyle &&
              setActiveStyle.value == false
            ) {
              setActiveStyle.value = true;
              currentIndex = codeStart + 1;
              continue;
            } else {
              if (cursor && cursor.value >= endCode + 1) {
                cursor.value -= 1;
              }

              newText =
                newText.substring(0, codeStart) +
                newText.substring(codeStart + 1, endCode) +
                "\u200B" +
                newText.substring(endCode + 1);
              nodes.forEach((obj) => {
                if (obj.position !== undefined && obj.position > codeStart) {
                  obj.position -= 1;
                }
                if (obj.position !== undefined && obj.position >= endCode) {
                  obj.position -= 1;
                }
                if (obj.position !== undefined && obj.position > endCode) {
                  obj.position += 1;
                }
              });

              currentIndex = codeStart;
              continue;
            }
          }
        } else {
          currentIndex++;
          continue;
        }
      } else {
        currentIndex++;
        continue;
      }
    }
    if (nodes.length > 0) {
      return { nodesArr: nodes, newText: newText };
    }
    return { nodesArr: [], newText: newText };
  }

  var newNodes = processText(text);

  ast = newNodes.nodesArr;
  ast.push({ type: "messageText", content: newNodes.newText });
  return ast;
}

function astToHtml(ast: AstNode[], cursor: { value: number }): string {
  var text = ast.filter((a) => a.type == "messageText")[0].content;
  var nodes = ast
    .filter(({ type }) => type == "marker")
    .sort(({ position: posA }, { position: posB }) => posB - posA);

  nodes.forEach((node) => {
    if (node.content.startsWith("<img")) {
      const img = node;
      newText =
        text.substring(0, img.position) +
        img.content.substring(
          img.content.indexOf('alt="') + 5,
          img.content.indexOf('"', img.content.indexOf('alt="') + 5)
        ) +
        text.substring(img.position);
      text = newText;
    } else {
      var newText = text.substring(0, node.position) + node.content;

      if (node.content == "</blockquote>") {
        if (!text.substring(node.position).startsWith("\u200B")) {
          newText += "\u200B";
        }
      }
      newText += text.substring(node.position);
      text = newText;
    }
  });

  return text;
}
const pairs: { [key: string]: string } = {
  "<b>": "</b>",
  "<i>": "</i>",
  "<s>": "</s>",
  "<pre>": "</pre>",
  "<u>": "</u>",
  "<code>": "</code>",
  "<span>": "</span>",
  "<blockquote>": "</blockquote>",
  '<blockquote data-entity-type="MessageEntityBlockqoute">': "</blockquote>",
  '<blockquote class="blockquote" data-entity-type="MessageEntityBlockquote">':
    "</blockquote>",
  '<b data-entity-type="MessageEntityBold">': "</b>",
  '<i data-entity-type="MessageEntityItalic">': "</i>",
  '<s data-entity-type="MessageEntityStrike">': "</s>",
  '<u data-entity-type="MessageEntityUnderline">': "</u>",
  '<span class="spoiler" data-entity-type="MessageEntitySpoiler">': "</span>",
  '<span data-entity-type="MessageEntitySpoiler">': "</span>",
  '<code class="text-entity-code">': "</code>",
  '<pre class="text-entity-pre">': "</pre>",
  "<!--StartFragment-->": "<!--EndFragment-->",
};

function enhanceCursorTags(
  nodes: AstNode[],
  cursor?: { value: number },
  setActiveStyle?: { value: boolean }
): AstNode[] {
  var text = nodes
    .filter((node) => node.type === "messageText")
    .map((node) => node.content);
  var orig = text[0];
  var i = 0;
  if (cursor) {
    while (i < cursor?.value) {
      let openTagIndex = 0;
      const openTag = nodes.findIndex(
        (node) =>
          node.type == "marker" &&
          cursor?.value >= node.position &&
          node.position >= i &&
          node.content in pairs
      );

      if (openTag !== -1) {
        openTagIndex = openTag;
        const closingTag = nodes.findIndex(
          (node, i) =>
            i > openTagIndex &&
            node.content === pairs[nodes[openTagIndex].content]
        );

        if (closingTag !== -1 && cursor.value <= nodes[closingTag].position) {
          switch (nodes[openTagIndex].content) {
            case "<u>":
              if (nodes[openTagIndex] && nodes[openTagIndex].position) {
                i = nodes[openTagIndex].position + 1;
              }

              break;
            case "<b>":
              console.log(orig[nodes[openTagIndex].position]);
              console.log(orig[nodes[openTagIndex].position + 1]);
              console.log(orig[nodes[closingTag].position - 2]);
              console.log(orig[nodes[closingTag].position - 1]);
              if (
                (orig[nodes[openTagIndex].position] == "*" &&
                  orig[nodes[openTagIndex].position + 1] != "*" &&
                  orig[nodes[closingTag].position - 2] == "*" &&
                  orig[nodes[closingTag].position - 1] == "*") ||
                (orig[nodes[openTagIndex].position] == "*" &&
                  orig[nodes[openTagIndex].position + 1] == "*" &&
                  orig[nodes[closingTag].position - 1] == "*" &&
                  orig[nodes[closingTag].position - 2] != "*")
              ) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (
                  orig[nodes[openTagIndex].position] == "*" &&
                  orig[nodes[openTagIndex].position + 1] == "*" &&
                  orig[nodes[closingTag].position - 2] == "*" &&
                  orig[nodes[closingTag].position - 1] == "*"
                ) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    nodes[openTagIndex].content += `**`;
                    nodes[
                      closingTag
                    ].content = `**${nodes[closingTag].content}`;

                    if (cursor) {
                      cursor.value += 2;
                    }
                    setActiveStyle.value = true;
                    console.log("TRUE");
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;
            case "<i>":
              console.log(orig[nodes[openTagIndex].position]);
              console.log(orig[nodes[openTagIndex].position + 1]);
              console.log(orig[nodes[closingTag].position - 2]);
              console.log(orig[nodes[closingTag].position - 1]);
              if (
                (orig[nodes[openTagIndex].position] == "_" &&
                  orig[nodes[openTagIndex].position + 1] != "_" &&
                  orig[nodes[closingTag].position - 2] == "_" &&
                  orig[nodes[closingTag].position - 1] == "_") ||
                (orig[nodes[openTagIndex].position] == "_" &&
                  orig[nodes[openTagIndex].position + 1] == "_" &&
                  orig[nodes[closingTag].position - 1] == "_" &&
                  orig[nodes[closingTag].position - 2] != "_")
              ) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (
                  orig[nodes[openTagIndex].position] == "_" &&
                  orig[nodes[openTagIndex].position + 1] == "_" &&
                  orig[nodes[closingTag].position - 2] == "_" &&
                  orig[nodes[closingTag].position - 1] == "_"
                ) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                    nodes[openTagIndex].content += `__`;
                    nodes[
                      closingTag
                    ].content = `__${nodes[closingTag].content}`;
                    if (cursor) {
                      cursor.value += 2;
                    }

                    console.log("TRUE");
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;
            case "<s>":
              if (
                (text[0][nodes[openTagIndex].position] == "~" &&
                  text[0][nodes[openTagIndex].position + 1] != "~" &&
                  text[0][nodes[closingTag].position - 2] == "~" &&
                  text[0][nodes[closingTag].position - 1] == "~") ||
                (text[0][nodes[openTagIndex].position] == "~" &&
                  text[0][nodes[openTagIndex].position + 1] == "~" &&
                  text[0][nodes[closingTag].position - 1] == "~" &&
                  text[0][nodes[closingTag].position - 2] != "~")
              ) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (
                  text[0][nodes[openTagIndex].position] == "~" &&
                  text[0][nodes[openTagIndex].position + 1] == "~" &&
                  text[0][nodes[closingTag].position - 2] == "~" &&
                  text[0][nodes[closingTag].position - 1] == "~"
                ) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                    nodes[openTagIndex].content += `~~`;
                    nodes[
                      closingTag
                    ].content = `~~${nodes[closingTag].content}`;
                    if (cursor) {
                      cursor.value += 2;
                    }
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;

            case `<span class="spoiler" data-entity-type="MessageEntitySpoiler">`:
              if (
                (text[0][nodes[openTagIndex].position] == "|" &&
                  text[0][nodes[openTagIndex].position + 1] != "|" &&
                  text[0][nodes[closingTag].position - 2] == "|" &&
                  text[0][nodes[closingTag].position - 1] == "|") ||
                (text[0][nodes[openTagIndex].position] == "|" &&
                  text[0][nodes[openTagIndex].position + 1] == "|" &&
                  text[0][nodes[closingTag].position - 1] == "|" &&
                  text[0][nodes[closingTag].position - 2] != "|")
              ) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (
                  text[0][nodes[openTagIndex].position] == "|" &&
                  text[0][nodes[openTagIndex].position + 1] == "|" &&
                  text[0][nodes[closingTag].position - 2] == "|" &&
                  text[0][nodes[closingTag].position - 1] == "|"
                ) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                    nodes[openTagIndex].content += `||`;
                    nodes[
                      closingTag
                    ].content = `||${nodes[closingTag].content}`;
                    if (cursor) {
                      cursor.value += 2;
                    }
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;

            case '<pre class="text-entity-pre">':
              var i = 0;
              text[0][nodes[openTagIndex].position] == "`" ? i++ : null;
              text[0][nodes[openTagIndex].position + 1] == "`" ? i++ : null;
              text[0][nodes[openTagIndex].position + 2] == "`" ? i++ : null;
              text[0][nodes[closingTag].position - 2] == "`" ? i++ : null;
              text[0][nodes[closingTag].position - 1] == "`" ? i++ : null;
              text[0][nodes[openTagIndex].position - 3] == "`" ? i++ : null;
              if (i > 3 && i < 6) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (i == 6) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                    nodes[openTagIndex].content += "```";
                    nodes[closingTag].content =
                      "```" + nodes[closingTag].content;

                    if (cursor) {
                      cursor.value += 3;
                    }
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;

            case '<code class="text-entity-code">':
              if (
                (text[0][nodes[openTagIndex].position] != "`" &&
                  text[0][nodes[closingTag].position - 1] == "`") ||
                (text[0][nodes[openTagIndex].position] == "`" &&
                  text[0][nodes[closingTag].position - 1] != "`")
              ) {
                nodes.splice(closingTag, 1);
                nodes.splice(openTagIndex, 1);
                if (setActiveStyle && setActiveStyle.value) {
                  setActiveStyle.value = false;
                }
              } else {
                if (
                  text[0][nodes[openTagIndex].position] == "`" &&
                  text[0][nodes[closingTag].position - 1] == "`"
                ) {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                  }
                } else {
                  if (setActiveStyle && !setActiveStyle.value) {
                    setActiveStyle.value = true;
                    nodes[openTagIndex].content += "`";
                    nodes[closingTag].content = "`" + nodes[closingTag].content;
                    if (cursor) {
                      cursor.value += 1;
                    }
                  }
                }
              }
              i = nodes[openTagIndex].position + 1;
              break;
            default:
              i = nodes[openTagIndex].position + 1;
              break;
          }
        } else {
          i = nodes[openTagIndex].position + 1;
        }
      } else {
        break;
      }
    }
  }
  nodes.forEach((el) => {
    if (el.type == "messageText") {
      el.content = text[0];
    }
  });
  return nodes;
}

export default function parseHtmlAsFormattedText(
  html: string,
  withMarkdownLinks = false,
  skipMarkdown = false
): ApiFormattedText {
  html = html.replace(/&nbsp;/g, " ");
  html = html.replace(/<div><br([^>]*)?><\/div>/g, "\n");
  html = html.replace(/<br([^>]*)?>/g, "\n");
  html = html.replace(/<\/div>(\s*)<div>/g, "\n");
  html = html.replace(/<div>/g, "\n");
  html = html.replace(/<\/div>/g, "");
  html = html.replace(/\u200B/g, "");
  const regex = /\\/g;

  const ast = parseHtmlToAst(html);

  var transformedAst = transformAst(ast, withMarkdownLinks, skipMarkdown);

  const stringifiedArray = transformedAst.map((obj) => JSON.stringify(obj));

  const uniqueStringifiedSet = new Set(stringifiedArray);

  transformedAst = Array.from(uniqueStringifiedSet).map((str) =>
    JSON.parse(str)
  );

  var text = transformedAst.filter((el) => el.type == "messageText")[0].content;
  var nodes = transformedAst
    .filter((el) => el.type === "marker")
    .map((el) => {
      el.content = el.content.replace(/\n/g, "");
      el.content = el.content.replace(regex, "");
      el.content = el.content.replace(/\s{2,}/g, " ");
      el.content = el.content.replace(/ >\s*/g, ">");
      el.content = el.content.trim();
      return el;
    });

  const entities: ApiMessageEntity[] = [];
  console.log(nodes);
  if (nodes.length > 0) {
    while (nodes.length > 0) {
      var openTag = nodes[0];
      console.log(nodes);
      console.log(text);
      if (openTag.content.startsWith("<img")) {
        const img = nodes[0];
        text =
          text.substring(0, img.position) +
          img.content.substring(
            img.content.indexOf('alt="') + 5,
            img.content.indexOf('"', img.content.indexOf('alt="') + 5)
          ) +
          text.substring(img.position);
        nodes.splice(0, 1);
        continue;
      }

      if (openTag.content.startsWith("<a href")) {
        const hrefStart = openTag.content.indexOf('href="') + 6;
        const hrefEnd = openTag.content.indexOf('"', hrefStart);

        const url = openTag.content.substring(hrefStart, hrefEnd);

        const endTagIndex = nodes.findIndex((el) => el.content === "</a>");

        if (endTagIndex !== -1 && url) {
          entities.push({
            offset: nodes[0].position,
            length: nodes[endTagIndex].position - nodes[0].position,
            type: ApiMessageEntityTypes.TextUrl,
            url: url,
          });

          nodes.splice(endTagIndex, 1);
          nodes.splice(0, 1);
          continue;
        }
      }

      var closingTag = nodes.findIndex(
        (node, x) => x > 0 && node.content === pairs[nodes[0].content]
      );
      console.log(openTag);
      console.log(nodes[closingTag]);

      if (closingTag > -1 && openTag) {
        var type;

        switch (nodes[closingTag].content) {
          case "</u>":
            type = ApiMessageEntityTypes.Underline;
            break;
          case "</blockquote>":
            type = ApiMessageEntityTypes.Blockquote;
            break;
          case "</b>":
            type = ApiMessageEntityTypes.Bold;
            break;
          case "</i>":
            type = ApiMessageEntityTypes.Italic;
            break;
          case "</s>":
            type = ApiMessageEntityTypes.Strike;
            break;
          case "</pre>":
            type = ApiMessageEntityTypes.Pre;
            break;
          case "</code>":
            type = ApiMessageEntityTypes.Code;
            break;
          case "</span>":
            type = ApiMessageEntityTypes.Spoiler;
            break;
          case "<!--EndFragment-->":
            nodes.splice(closingTag, 1);
            nodes.splice(0, 1);
            continue;
        }

        entities.push({
          offset: nodes[0].position,
          length: nodes[closingTag].position - nodes[0].position,
          type: type,
        });
        nodes.splice(closingTag, 1);
        nodes.splice(0, 1);
      } else {
        nodes.splice(0, 1);
      }
    }
  }
  console.log(entities);
  if (entities.length > 0) {
    return { text, entities };
  } else {
    return { text };
  }
}

export function parseHtmlForContenteditable(
  html: string,
  withMarkdownLinks = false,
  skipMarkdown = false,
  cursor: { value: number }
) {
  var setActiveStyle = { value: false };

  html = html.replace(/&nbsp;/g, " ");
  html = html.replace(/<div><br([^>]*)?><\/div>/g, "\n");
  html = html.replace(/<br([^>]*)?>/g, "\n");
  html = html.replace(/<\/div>(\s*)<div>/g, "\n");
  html = html.replace(/<div>/g, "\n");
  html = html.replace(/<\/div>/g, "");

  if (html.indexOf("\u200B\u200B") > -1) {
    var indexWhite = html.indexOf("\u200B\u200B");

    while (indexWhite > -1) {
      html = html.replace(/\u200B\u200B/g, "\u200B");
      indexWhite = html.indexOf("\u200B\u200B");
    }
  }

  const ast = parseHtmlToAst(html);

  var transformedAst = transformAst(
    ast,
    withMarkdownLinks,
    skipMarkdown,
    cursor,
    setActiveStyle
  );

  const stringifiedArray = transformedAst.map((obj) => JSON.stringify(obj));
  const uniqueStringifiedSet = new Set(stringifiedArray);
  transformedAst = Array.from(uniqueStringifiedSet).map((str) =>
    JSON.parse(str)
  );

  var newTranform = enhanceCursorTags(transformedAst, cursor, setActiveStyle);
  transformedAst = newTranform;

  const finalHtml = astToHtml(transformedAst, cursor);

  return finalHtml;
}

export function fixImageContent(fragment: HTMLDivElement) {
  fragment.querySelectorAll("img").forEach((node) => {
    if (node.dataset.documentId) {
      node.textContent = (node as HTMLImageElement).alt || "";
    } else {
      node.replaceWith(node.alt || "");
    }
  });
}
