
// Namespace object.
const TableSort = {};

/**
 * Switch to enable or disable the TableSort.
 */
TableSort.enabled = true;

/**
 * HTML for up indicator (sorted small to big).
 */
TableSort.arrowUp = ' &#x25b2;';

/**
 * HTML for down indicator (sorted big to small).
 */
TableSort.arrowDown = ' &#x25bc;';

/**
 * HTML for unsorted indicator.
 */
TableSort.arrowNone = ' &nbsp;';

/**
 * Tooltip to display when mousing over a sorting link.
 */
TableSort.titleText = 'Sort by this column';

/**
 * List of all the tables.
 * @private
 */
TableSort.tables_ = [];

/**
 * Upon which column was the table sorted last time.  -=up, +=down
 * @private
 */
TableSort.lastSort_ = [];


/**
 * Make all tables sortable.
 */
TableSort.initAll = () => {
  if (!TableSort.enabled) {
    return;
  }
  const tableNodeList = document.getElementsByTagName('table');
  for (let x = 0, table; table = tableNodeList[x]; x++) {
    TableSort.initTable_(table);
  }
};


/**
 * Make one or more tables sortable.
 * Call this function with the ID(s) of any tables which are created
 * with DTHML after the page has loaded.
 * @param {...string} var_args ID(s) of tables.
 */
TableSort.init = function(var_args) {
  if (!TableSort.enabled) {
    return;
  }
  for (let x = 0; x < arguments.length; x++) {
    const table = document.getElementById(arguments[x]);
    if (table) {
      TableSort.initTable_(table);
    }
  }
};


/**
 * Turn all the header/footer cells of one table into sorting links.
 * @param {Element} table The table to be converted.
 * @private
 */
TableSort.initTable_ = table => {
  TableSort.tables_.push(table);
  const t = TableSort.tables_.length - 1;
  if (table.tHead) {
    for (var y = 0, row; row = table.tHead.rows[y]; y++) {
      for (var x = 0, cell; cell = row.cells[x]; x++) {
        TableSort.linkCell_(cell, t, x);
      }
    }
  }
  if (table.tFoot) {
    for (var y = 0, row; row = table.tFoot.rows[y]; y++) {
      for (var x = 0, cell; cell = row.cells[x]; x++) {
        TableSort.linkCell_(cell, t, x);
      }
    }
  }
  TableSort.lastSort_[t] = 0;
};


/**
 * Turn one header/footer cell into a sorting link.
 * @param {!Element} cell The TH or TD to be made a link.
 * @param {number} t Index of table in TableSort array.
 * @param {number} x Column index.
 * @private
 */
TableSort.linkCell_ = (cell, t, x) => {
  if (TableSort.getClass_(cell)) {
    const link = document.createElement('A');
    link.href = `javascript:TableSort.click(${t}, ${x}, "${escape(TableSort.getClass_(cell))}");`;
    if (TableSort.titleText) {
      link.title = TableSort.titleText;
    }
    while (cell.hasChildNodes()) {
      link.appendChild(cell.firstChild);
    }
    cell.appendChild(link);
    // Add an element where the sorting arrows will go.
    const arrow = document.createElement('SPAN');
    arrow.innerHTML = TableSort.arrowNone;
    arrow.className = `TableSort_${t}_${x}`;
    cell.appendChild(arrow);
  }
};


/**
 * Return the class name for a cell.  The name must match a sorting function.
 * @param {!Element} cell The cell element.
 * @return {string} Class name matching a sorting function.
 * @private
 */
TableSort.getClass_ = cell => {
  const className = (cell.className || '').toLowerCase();
  const classList = className.split(/\s+/g);
  for (let x = 0; x < classList.length; x++) {
    if ((`compare_${classList[x]}`) in TableSort) {
      return classList[x];
    }
  }
  return '';
};


/**
 * 
 * Sort the rows in this table by the specified column.
 * @param {number} t Index of table in TableSort array.
 * @param {number} column Index of the column to sort by.
 * @param {string} mode Sorting mode (e.g. 'nocase').
 */
TableSort.click = (t, column, mode) => {
  const table = TableSort.tables_[t];
  if (!mode.match(/^[_a-z0-9]+$/)) {
    alert('Illegal sorting mode type.');
    return;
  }
  // 支持定义排序方法
  const compareFunction = TableSort[`compare_${mode}`];
  if (typeof compareFunction != 'function') {
    alert(`Unknown sorting mode: ${mode}`);
    return;
  }
  // Determine and record the direction.
  let reverse = false;
  if (Math.abs(TableSort.lastSort_[t]) == column + 1) {
    reverse = TableSort.lastSort_[t] > 0;
    TableSort.lastSort_[t] *= -1;
  } else {
    TableSort.lastSort_[t] = column + 1;
  }
  // Display the correct arrows on every header/footer cell.
  const spanMatchAll = new RegExp(`\\bTableSort_${t}_\\d+\\b`);
  const spanMatchExact = new RegExp(`\\bTableSort_${t}_${column}\\b`);
  const spans = table.getElementsByTagName('SPAN');
  for (let s = 0, span; span = spans[s]; s++) {
    if (span.className && spanMatchAll.test(span.className)) {
      if (spanMatchExact.test(span.className)) {
        if (reverse) {
          span.innerHTML = TableSort.arrowDown;
        } else {
          span.innerHTML = TableSort.arrowUp;
        }
      } else {
        span.innerHTML = TableSort.arrowNone;
      }
    }
  }
  // Fetch the table's data and store it in a dictionary (assoc array).
  if (!table.tBodies.length) {
    return; // No data in table.
  }
  const tablebody = table.tBodies[0];
  const cellDictionary = [];
  for (var y = 0, row; row = tablebody.rows[y]; y++) {
    let cell;
    if (row.cells.length) {
      cell = row.cells[column];
    } else { // Dodge Safari 1.0.3 bug
      cell = row.childNodes[column];
    }
    cellDictionary[y] = [TableSort.dom2txt_(cell), row];
  }
  // Sort the dictionary.
  cellDictionary.sort(compareFunction);
  // Rebuild the table with the new order.
  for (y = 0; y < cellDictionary.length; y++) {
    const i = reverse ? (cellDictionary.length - 1 - y) : y;
    tablebody.appendChild(cellDictionary[i][1]);
  }
};


/**
 * Recursively build a plain-text version of a DOM structure.
 * Bug: whitespace isn't always correct, but shouldn't matter for tablesort.
 * @param {Element} obj Element to flatten into text.
 * @return {string} Plain-text contents of element.
 * @private
 */
TableSort.dom2txt_ = obj => {
  if (!obj) {
    return '';
  }
  if (obj.nodeType == 3) {
    return obj.data;
  }
  const textList = [];
  for (let x = 0, child; child = obj.childNodes[x]; x++) {
    textList[x] = TableSort.dom2txt_(child);
  }
  return textList.join('');
};


/**
 * 区分大小写排序
 * Case-sensitive sorting.
 * Compare two dictionary structures and indicate which is larger.
 * @param {!Array} a First tuple.
 * @param {!Array} b Second tuple.
 * @return {number} Number indicating which param is larger (-1/0/1).
 */
TableSort['compare_case'] = (a, b) => {
  if (a[0] == b[0]) {
    return 0;
  }
  return (a[0] > b[0]) ? 1 : -1;
};

/**
 * 不区分大小写排序
 * Case-insensitive sorting.
 * Compare two dictionary structures and indicate which is larger.
 * @param {Array} a First tuple.
 * @param {Array} b Second tuple.
 * @return {number} Number indicating which param is larger (-1/0/1).
 */
TableSort['compare_nocase'] = (a, b) => {
  const aLower = a[0].toLowerCase();
  const bLower = b[0].toLowerCase();
  if (aLower == bLower) {
    return 0;
  }
  return (aLower > bLower) ? 1 : -1;
};

/**
 * 数字排序
 * Numeric sorting.
 * Compare two dictionary structures and indicate which is larger.
 * @param {Array} a First tuple.
 * @param {Array} b Second tuple.
 * @return {number} Number indicating which param is larger (-1/0/1).
 */
TableSort['compare_num'] = (a, b) => {
  let aNum = parseFloat(a[0]);
  if (isNaN(aNum)) {
    aNum = -Number.MAX_VALUE;
  }
  let bNum = parseFloat(b[0]);
  if (isNaN(bNum)) {
    bNum = -Number.MAX_VALUE;
  }
  if (aNum == bNum) {
    return 0;
  }
  return (aNum > bNum) ? 1 : -1;
};


if (window.addEventListener) {
  window.addEventListener('load', TableSort.initAll, false);
} else if (window.attachEvent) {
  window.attachEvent('onload', TableSort.initAll);
}


// Export symbols in case of agressive compilation.
window['TableSort'] = TableSort;
TableSort['click'] = TableSort.click;