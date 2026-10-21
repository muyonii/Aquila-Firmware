// frontend-ui/src/pages/admin/users/core/UserManager.js

import { adminApi } from '../../../../api/admin_api';
import { UserFilterCriteria } from './UserFilterCriteria';

// Local mock fallback for development if MySQL is offline
const FALLBACK_USERS = [
  {
    user_id: 1,
    full_name: 'BAWASA System Admin',
    email: 'admin@bawasa.gov.ph',
    role: 'admin',
    assigned_node_id: null,
    household_label: null,
    purok_cluster: 'Balanga Hub',
    created_at: '2026-09-01 08:00:00'
  },
  {
    user_id: 2,
    full_name: 'Juan Plumber (Field Tech)',
    email: 'technician@bawasa.gov.ph',
    role: 'technician',
    assigned_node_id: null,
    household_label: null,
    purok_cluster: 'Sector 03',
    created_at: '2026-09-01 08:30:00'
  },
  {
    user_id: 3,
    full_name: 'Maria Dela Cruz',
    email: 'resident1@gmail.com',
    role: 'resident',
    assigned_node_id: 'NODE-B1-001',
    household_label: 'Household 01 (Physical Testbed)',
    purok_cluster: 'Purok 2',
    created_at: '2026-09-02 09:15:00'
  },
  {
    user_id: 4,
    full_name: 'Elena Santos',
    email: 'elena.santos@gmail.com',
    role: 'resident',
    assigned_node_id: 'NODE-B1-002',
    household_label: 'Household 02 (Santos Family)',
    purok_cluster: 'Purok 2',
    created_at: '2026-09-03 11:20:00'
  },
  {
    user_id: 5,
    full_name: 'Gerry Bautista',
    email: 'gerry.bautista@gmail.com',
    role: 'resident',
    assigned_node_id: null,
    household_label: null,
    purok_cluster: 'Purok 2',
    created_at: '2026-09-05 14:00:00'
  }
];

export class UserManager {
  static #instance = null;

  constructor() {
    if (UserManager.#instance) {
      return UserManager.#instance;
    }
    this.users = [...FALLBACK_USERS];
    this.nodes = [];
    UserManager.#instance = this;
  }

  static getInstance() {
    if (!UserManager.#instance) {
      UserManager.#instance = new UserManager();
    }
    return UserManager.#instance;
  }

  async loadAll() {
    try {
      const [usersRes, nodesRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getNodes()
      ]);

      if (usersRes?.success && Array.isArray(usersRes.data?.users)) {
        this.users = usersRes.data.users;
      }
      if (nodesRes?.success && Array.isArray(nodesRes.data?.nodes)) {
        this.nodes = nodesRes.data.nodes;
      }
    } catch (err) {
      console.warn('[UserManager] Backend API unreachable. Operating with local fallback.', err);
    }

    return {
      users: [...this.users],
      nodes: [...this.nodes]
    };
  }

  computeKpis(usersList = this.users) {
    const total = usersList.length;
    const residents = usersList.filter((u) => u.role === 'resident');
    const boundResidents = residents.filter((u) => u.assigned_node_id);
    const techs = usersList.filter((u) => u.role === 'technician').length;
    const admins = usersList.filter((u) => u.role === 'admin').length;

    return {
      total,
      boundCount: boundResidents.length,
      unboundCount: residents.length - boundResidents.length,
      techs,
      admins
    };
  }

  filter(usersList = this.users, criteria) {
    if (!(criteria instanceof UserFilterCriteria)) {
      return [...usersList];
    }
    return usersList.filter((u) => criteria.matches(u));
  }

  async createUser(payload) {
    const res = await adminApi.createUser(payload);
    await this.loadAll();
    return res;
  }

  async resetPassword(userId) {
    const res = await adminApi.updateUser(userId, { password: 'Password123!' });
    await this.loadAll();
    return res;
  }

  async deleteUser(userId) {
    const res = await adminApi.deleteUser(userId);
    await this.loadAll();
    return res;
  }
}

export const userManager = UserManager.getInstance();