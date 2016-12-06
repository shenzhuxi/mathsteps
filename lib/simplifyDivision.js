'use strict';

const Fraction = require('./Fraction');
const MathChangeTypes = require('./MathChangeTypes');
const NodeCreator = require('./NodeCreator');
const NodeStatus = require('./NodeStatus');
const NodeType = require('./NodeType');

// Searches for and simplifies any chains of division or nested division.
// Returns a NodeStatus object
function simplifyDivisionDFS(node) {
  if (NodeType.isConstant(node) || NodeType.isSymbol(node)) {
    return NodeStatus.noChange(node);
  }
  else if (NodeType.isOperator(node)) {
    // e.g. 2/x/6 -> 2/(x*6)
    let nodeStatus = simplifyDivisionChain(node);
    if (nodeStatus.hasChanged()) {
      return nodeStatus;
    }
    // e.g. 2/(x/6) => 2 * 6/x
    nodeStatus =  Fraction.multiplyByInverse(node);
    if (nodeStatus.hasChanged()) {
      return nodeStatus;
    }
    // If no change, recurse on the children
    for (let i = 0; i < node.args.length; i++) {
      const child = node.args[i];
      let childNodeStatus = simplifyDivisionDFS(child);
      if (childNodeStatus.hasChanged()) {
        return NodeStatus.childChanged(node, childNodeStatus, i);
      }
    }
    return NodeStatus.noChange(node);
  }
  else if (NodeType.isFunction(node)) {
    for (let i = 0; i < node.args.length; i++) {
      const child = node.args[i];
      let childNodeStatus = simplifyDivisionDFS(child);
      if (childNodeStatus.hasChanged()) {
        return NodeStatus.childChanged(node, childNodeStatus, i);
      }
    }
    return NodeStatus.noChange(node);
  }
  else if (NodeType.isParenthesis(node)) {
    let contentNodeStatus = simplifyDivisionDFS(node.content);
    if (contentNodeStatus.hasChanged()) {
      return NodeStatus.childChanged(node, contentNodeStatus);
    }
    else {
      return NodeStatus.noChange(node);
    }
  }
  else if (NodeType.isUnaryMinus(node)) {
    const status = simplifyDivisionDFS(node.args[0]);
    if (status.hasChanged()) {
      return NodeStatus.childChanged(node, status);
    }
    else {
      return NodeStatus.noChange(node);
    }
  }
  else {
    throw Error('Unsupported node type for : ' + node);
  }
}

// Simplifies any chains of division into a single division operation.
// e.g. 2/x/6 -> 2/(x*6)
// Returns a NodeStatus object
function simplifyDivisionChain(node) {
  // check for a chain of division
  let denominatorList = getDenominatorList(node);
  // one for the numerator, and at least two terms in the denominator
  if (denominatorList.length > 2) {
    const numerator = denominatorList.shift();
    // the new single denominator is all the chained denominators
    // multiplied together, in parentheses.
    const denominator = NodeCreator.parenthesis(
      NodeCreator.operator('*', denominatorList));
    const newNode = NodeCreator.operator('/', [numerator, denominator]);
    const oldNode = node;
    return NodeStatus.nodeChanged(
      MathChangeTypes.SIMPLIFY_DIVISION, oldNode, newNode);
  }
  else {
    for (let i = 0; i < node.args.length; i++) {
      const child = node.args[i];
      let childNodeStatus = simplifyDivisionDFS(child);
      if (childNodeStatus.hasChanged()) {
        return NodeStatus.childChanged(node, childNodeStatus, i);
      }
    }
  }
  return NodeStatus.noChange(node);
}

// Given a the denominator of a division node, returns all the nested
// denominator nodess. e.g. 2/3/4/5 would return [2,3,4,5]
// (note: all the numbers in the example are actually constant nodes)
function getDenominatorList(denominator) {
  let node = denominator;
  let denominatorList = [];
  while (node.op === '/') {
    // unshift the denominator to the front of the list, and recurse on
    // the numerator
    denominatorList.unshift(node.args[1]);
    node = node.args[0];
  }
  // unshift the final node, which wasn't a / node
  denominatorList.unshift(node);
  return denominatorList;
}

module.exports = simplifyDivisionDFS;