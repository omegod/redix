export interface KeyTreeNode {
  id: string;
  label: string;
  fullKey?: string;
  isLeaf: boolean;
  count: number;
  children: KeyTreeNode[];
}

interface MutableTreeNode {
  id: string;
  label: string;
  fullKey?: string;
  isLeaf: boolean;
  count: number;
  children: Map<string, MutableTreeNode>;
}

const sortNodes = (nodes: MutableTreeNode[]): KeyTreeNode[] =>
  nodes
    .sort((left, right) => {
      if (left.isLeaf !== right.isLeaf) {
        return left.isLeaf ? 1 : -1;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    })
    .map((node) => ({
      id: node.id,
      label: node.label,
      fullKey: node.fullKey,
      isLeaf: node.isLeaf,
      count: node.count,
      children: sortNodes([...node.children.values()])
    }));

export const buildKeyTree = (keys: string[], delimiter = ":"): KeyTreeNode[] => {
  const root: MutableTreeNode = {
    id: "root",
    label: "root",
    isLeaf: false,
    count: 0,
    children: new Map()
  };

  for (const key of [...keys].sort((left, right) => left.localeCompare(right, "zh-CN"))) {
    const parts = key.split(delimiter).filter(Boolean);
    const fallbackParts = parts.length > 0 ? parts : [key];
    let current = root;

    fallbackParts.forEach((part, index) => {
      const isLeaf = index === fallbackParts.length - 1;
      const id = fallbackParts.slice(0, index + 1).join(delimiter);
      const existing = current.children.get(id);
      if (existing) {
        existing.count += 1;
        if (isLeaf) {
          existing.fullKey = key;
        }
        current = existing;
        return;
      }

      const next: MutableTreeNode = {
        id,
        label: part,
        fullKey: isLeaf ? key : undefined,
        isLeaf,
        count: 1,
        children: new Map()
      };
      current.children.set(id, next);
      current = next;
    });
  }

  return sortNodes([...root.children.values()]);
};
