import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, './synthetic_nodes.json');
export const SYNTHETIC_NODES = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * Returns downstream children node IDs for a given parent node
 */
export function getDownstreamChildren(parentNodeId) {
    return SYNTHETIC_NODES
        .filter(n => n.parent_node_id === parentNodeId)
        .map(n => n.node_id);
}

/**
 * Builds the parent lookup map: childNodeId -> parentNodeId
 */
export function getDagMap() {
    const map = {};
    for (const node of SYNTHETIC_NODES) {
        if (node.parent_node_id) {
            map[node.node_id] = node.parent_node_id;
        }
    }
    return map;
}