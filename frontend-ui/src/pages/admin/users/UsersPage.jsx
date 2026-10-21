import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '../../../api/admin_api';
import { rtdbSubscription } from '../../../firebase/rtdb_subscription';
import { UserFilterCriteria } from './core/UserFilterCriteria';

import UserHeader from './components/UserHeader';
import UserKpiCards from './components/UserKpiCards';
import UserFilterBar from './components/UserFilterBar';
import UserTable from './components/UserTable';
import UserInspectorDrawer from './components/UserInspectorDrawer';
import AddUserModal from './components/AddUserModal';

export default function UsersPage() {
  const [data, setData] = useState({ users: [], nodes: [] });
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    try {
      const [usersRes, nodesRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getNodes()
      ]);

      const loadedUsers =
        usersRes?.success && Array.isArray(usersRes.data?.users)
          ? usersRes.data.users
          : [];
      const loadedNodes =
        nodesRes?.success && Array.isArray(nodesRes.data?.nodes)
          ? nodesRes.data.nodes
          : [];

      setData({ users: loadedUsers, nodes: loadedNodes });

      if (selectedUser) {
        const refreshed = loadedUsers.find((u) => u.user_id === selectedUser.user_id);
        setSelectedUser(refreshed || null);
      }
    } catch (err) {
      console.warn('[UsersPage] Failed loading users:', err.message);
    }
  };

  useEffect(() => {
    reload();
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();
    rtdbSubscription.subscribeBlackboardHypotheses();

    return () => {
      rtdbSubscription.unsubscribeAll();
    };
  }, []);

  const kpis = useMemo(() => {
    const list = data.users;
    const total = list.length;
    const residents = list.filter((u) => u.role === 'resident');
    const boundResidents = residents.filter((u) => u.assigned_node_id);
    const techs = list.filter((u) => u.role === 'technician').length;
    const admins = list.filter((u) => u.role === 'admin').length;

    return {
      total,
      boundCount: boundResidents.length,
      unboundCount: residents.length - boundResidents.length,
      techs,
      admins
    };
  }, [data.users]);

  const pendingApprovals = useMemo(() => {
    return data.users.filter(
      (u) => u.role === 'resident' && u.approval_status === 'PENDING'
    );
  }, [data.users]);

  const filteredUsers = useMemo(() => {
    const criteria = new UserFilterCriteria(roleFilter, search);
    return data.users.filter((u) => criteria.matches(u));
  }, [data.users, roleFilter, search]);

  const handleCreateUser = async (formPayload) => {
    setSubmitting(true);
    try {
      await adminApi.createUser({
        full_name: formPayload.full_name,
        email: formPayload.email,
        password: formPayload.password,
        role: formPayload.role,
        assigned_node_id:
          formPayload.role === 'resident' ? formPayload.assigned_node_id : null
      });
      setIsAddModalOpen(false);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (userId, updatePayload) => {
    try {
      await adminApi.updateUser(userId, updatePayload);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update user account.');
    }
  };

  const handleApproveMeter = async (userId, action = 'approve') => {
    try {
      await adminApi.approveResidentMeter(userId, action);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update meter approval status.');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Reset password to default: "Password123!"?')) return;
    try {
      await adminApi.updateUser(userId, { password: 'Password123!' });
      alert('Password reset successfully to Password123!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    if (userRole === 'admin' && kpis.admins <= 1) {
      alert('Safety Guardrail: Cannot delete the sole remaining administrator account.');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this account?')) return;
    try {
      await adminApi.deleteUser(userId);
      setSelectedUser(null);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="min-h-full bg-canvas text-slate-900 p-6 sm:p-10 space-y-8 select-none relative font-sans">
      <UserHeader onAddUserClick={() => setIsAddModalOpen(true)} />

      <UserKpiCards kpis={kpis} />

      {/* Pending Resident Meter Binding Approval Queue (RA 10173) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50/90 rounded-card p-5 border border-amber-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <h3 className="text-[0.8125rem] font-semibold text-amber-950 ">
                Pending Resident Meter Approvals ({pendingApprovals.length})
              </h3>
            </div>
            <span className="text-[10.5px] font-mono text-amber-800">
              RA 10173 Tenant Isolation Guard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.map((req) => (
              <div
                key={req.user_id}
                className="bg-white rounded-control p-3.5 border border-amber-200/80 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-[0.8125rem] text-slate-900 block truncate">
                    {req.full_name}
                  </span>
                  <span className="text-[0.8125rem] font-mono text-slate-600 block truncate">
                    {req.email} • Meter:{' '}
                    <strong className="text-slate-800">{req.assigned_node_id}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApproveMeter(req.user_id, 'approve')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[0.8125rem] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveMeter(req.user_id, 'reject')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                    title="Reject Request"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <UserFilterBar
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        search={search}
        onSearchChange={setSearch}
        counts={{
          total: kpis.total,
          residents: data.users.filter((u) => u.role === 'resident').length,
          techs: kpis.techs,
          admins: kpis.admins
        }}
      />

      <UserTable
        users={filteredUsers}
        selectedUserId={selectedUser?.user_id}
        onSelectUser={setSelectedUser}
      />

      <UserInspectorDrawer
        user={selectedUser}
        nodes={data.nodes}
        adminCount={kpis.admins}
        onClose={() => setSelectedUser(null)}
        onUpdateUser={handleUpdateUser}
        onApproveMeter={handleApproveMeter}
        onResetPassword={handleResetPassword}
        onDeleteUser={handleDeleteUser}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        nodes={data.nodes}
        onSubmit={handleCreateUser}
        submitting={submitting}
      />
    </div>
  );
}