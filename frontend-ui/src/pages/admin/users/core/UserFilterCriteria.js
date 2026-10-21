// frontend-ui/src/pages/admin/users/core/UserFilterCriteria.js

/**
 * UserFilterCriteria (Value Object)
 * Encapsulates role selection and fuzzy search text rules.
 */
export class UserFilterCriteria {
  constructor(role = 'all', search = '') {
    this.role = role.toLowerCase().trim();
    this.search = search.toLowerCase().trim();
  }

  matches(user) {
    if (!user) return false;

    // 1. Role match
    const roleMatches = this.role === 'all' || (user.role && user.role.toLowerCase() === this.role);
    if (!roleMatches) return false;

    // 2. Search query match
    if (!this.search) return true;

    const nameMatch = user.full_name?.toLowerCase().includes(this.search);
    const emailMatch = user.email?.toLowerCase().includes(this.search);
    const nodeMatch = user.assigned_node_id?.toLowerCase().includes(this.search);
    const labelMatch = user.household_label?.toLowerCase().includes(this.search);
    const clusterMatch = user.purok_cluster?.toLowerCase().includes(this.search);

    return Boolean(nameMatch || emailMatch || nodeMatch || labelMatch || clusterMatch);
  }
}