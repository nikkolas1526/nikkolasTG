
var endPre = newText.indexOf("```", preStart + 3);

var preNodesWasMade = nodes.findIndex(
  (node) =>
    node.type === "marker" &&
    node.content === '<pre>' &&
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
      cursor.value -= 3;
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
      cursor.value -= 3;
      continue;
    }
  }
}

if (endPre !== -1) {
  if (preNodesWasMade == -1 && preNodesWasMade1 == -1) {
    if (endPre == preStart + 3) {
      if (cursor.value == preStart + 6) {
        cursor.value -= 6;
      }
      if (cursor.value == preStart + 3) {
        cursor.value -= 3;
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
        content: '<pre>',
        position: preStart,
      });

      nodes.push({
        type: "marker",
        content: "</pre>",
        position: endPre + 3,
      });

      currentIndex = preStart;
      continue;
    }
  } else {
    if (
      cursor &&
      cursor.value >= preStart &&
      cursor.value <= endPre + 3
    ) {
      currentIndex = preStart + 3;
      continue;
    } else {
      if (cursor && cursor.value > endPre + 3) {
        cursor.value -= 6;
      }

      newText =
        newText.substring(0, preStart) +
        newText.substring(preStart + 3, endPre) +
        newText.substring(endPre + 3);
      nodes.forEach((obj) => {
        if (obj.position !== undefined && obj.position > preStart) {
          obj.position -= 3;
        }
        if (obj.position !== undefined && obj.position >= endPre) {
          obj.position -= 3;
        }
      });

      currentIndex = preStart;
      continue;
    }
  }
} else {
  currentIndex++;
  continue;
}