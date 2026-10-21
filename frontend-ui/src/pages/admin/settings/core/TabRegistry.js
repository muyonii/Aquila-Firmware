export class TabDefinition {
  constructor({ id, label, group, icon, iconColor = 'blue', keywords = [], component }) {
    this.id = id;
    this.label = label;
    this.group = group;
    this.icon = icon;
    this.iconColor = iconColor;
    this.keywords = keywords || [];
    this.component = component;
  }
}

export class TabRegistry {
  constructor() {
    this.tabs = new Map();
  }

  register(tabDefinition) {
    this.tabs.set(tabDefinition.id, tabDefinition);
    return this;
  }

  getTab(id) {
    return this.tabs.get(id) || null;
  }

  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  getGroups(searchQuery = '') {
    const q = (searchQuery || '').toLowerCase().trim();
    const groups = new Map();

    for (const tab of this.tabs.values()) {
      const matches =
        !q ||
        tab.label.toLowerCase().includes(q) ||
        (tab.keywords && tab.keywords.some((k) => k.toLowerCase().includes(q)));

      if (matches) {
        if (!groups.has(tab.group)) {
          groups.set(tab.group, []);
        }
        groups.get(tab.group).push(tab);
      }
    }

    return Array.from(groups.entries()).map(([groupName, items]) => ({
      group: groupName,
      items
    }));
  }

  getDefaultTabId() {
    return this.tabs.keys().next().value || 'profile';
  }
}