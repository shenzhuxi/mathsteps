'use strict';

const clone = require('clone');

const MathChangeTypes = require('./MathChangeTypes');
const NodeType = require('./NodeType');

// This represents the current (sub)expression we're simplifying.
// As we move step by step, a node might be updated. Functions return this
// status object to pass on the updated node and information on if/how it was
// changed.
// NodeStatus(node) creates a NodeStatus object that signals no change
class NodeStatus {
  constructor(changeType, oldNode, newNode, substeps=[]) {
    if (!newNode) {
      throw Error('node is not defined');
    }
    this.newNode = newNode;

    if (changeType === undefined || typeof(changeType) !== 'string') {
      throw Error('changetype isn\'t valid');
    }
    this.changeType = changeType;
    this.oldNode = oldNode;
    this.substeps = substeps;
  }

  hasChanged() {
    return this.changeType !== MathChangeTypes.NO_CHANGE;
  }

  reset() {
    this.oldNode = null;
    // clone so that the next step's oldNode doesn't modify this step's newNode
    this.newNode = NodeStatus.resetChangeGroups(this.newNode);
  }
}

NodeStatus.resetChangeGroups = function(node) {
  node = clone(node, false);
  node.filter(node => node.changeGroup).forEach(change => {
    delete change.changeGroup;
  });
  return node;
};

// A wrapper around the NodeStatus constructor for the case where node hasn't
// been changed.
NodeStatus.noChange = function(node) {
  return new NodeStatus(MathChangeTypes.NO_CHANGE, null, node);
};

// A wrapper around the NodeStatus constructor for the case of a change
// that is happening at the level of oldNode + newNode
// e.g. 2 + 2 --> 4 (an addition node becomes a constant node)
NodeStatus.nodeChanged = function(
  changeType, oldNode, newNode, defaultChangeGroup=true, steps=[]) {
  if (defaultChangeGroup) {
    oldNode.changeGroup = 1;
    newNode.changeGroup = 1;
  }
  return new NodeStatus(changeType, oldNode, newNode, steps);
};

// A wrapper around the NodeStatus constructor for the case where there was
// a change that happened deeper `node`'s tree, and `node`'s children must be
// updated to have the newNode/oldNode metadata (changeGroups)
// e.g. (2 + 2) + x --> 4 + x has to update the left argument
NodeStatus.childChanged = function(node, childStatus, childArgIndex=null) {
  let oldNode = clone(node, false);
  let newNode = clone(node, false);
  let substeps = childStatus.substeps;

  if (!childStatus.oldNode) {
    throw Error ('Expected old node for changeType: ' + childStatus.changeType);
  }

  if (NodeType.isParenthesis(node)) {
    oldNode.content = childStatus.oldNode;
    newNode.content = childStatus.newNode;
    substeps.map(step => {
      let oldNode = clone(node, false);
      let newNode = clone(node, false);
      oldNode.content = step.oldNode;
      newNode.content = step.newNode;
      step.oldNode = oldNode;
      step.newNode = newNode;
      return step;
    });
  }
  else if ((NodeType.isOperator(node) || NodeType.isFunction(node) &&
            childArgIndex !== null)) {
    newNode.args[childArgIndex] = childStatus.newNode;
    oldNode.args[childArgIndex] = childStatus.oldNode;
    substeps.map(step => {
      let oldNode = clone(node, false);
      let newNode = clone(node, false);
      oldNode.args[childArgIndex] = step.oldNode;
      newNode.args[childArgIndex] = step.newNode;
      step.oldNode = oldNode;
      step.newNode = newNode;
      return step;
    });
  }
  else if (NodeType.isUnaryMinus(node)) {
    oldNode.args[0] = childStatus.oldNode;
    newNode.args[0] = childStatus.newNode;
    substeps.map(step => {
      let oldNode = clone(node, false);
      let newNode = clone(node, false);
      oldNode.args[0] = step.oldNode;
      newNode.args[0] = step.newNode;
      step.oldNode = oldNode;
      step.newNode = newNode;
      return step;
    });
  }
  else {
    throw Error('Unexpected node type: ' + node.type);
  }

  return new NodeStatus(childStatus.changeType, oldNode, newNode, substeps);
};

module.exports = NodeStatus;