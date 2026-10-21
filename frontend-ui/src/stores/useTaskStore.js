import { create } from 'zustand';
import { taskApi } from '../api/task_api';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  activeTask: null,
  isLoading: false,
  error: null,
  isOnDuty: JSON.parse(localStorage.getItem('aquila_tech_on_duty') ?? 'true'),
  verificationStates: {},

  fetchMyTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskApi.getMyTasks();
      const taskList = res.data?.tasks || [];
      set({ tasks: taskList, isLoading: false });
      return taskList;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load assigned work orders.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchTaskDetails: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskApi.getTaskDetails(taskId);
      const task = res.data;
      set({ activeTask: task, isLoading: false });
      return task;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load work order details.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  claimTask: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskApi.claimTask(taskId);
      await get().fetchMyTasks();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to claim work order.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  arriveOnSite: async (taskId) => {
    try {
      const res = await taskApi.arriveOnSite(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.incident_id === taskId ? { ...t, node_status: 'MAINTENANCE' } : t
        ),
        activeTask:
          state.activeTask?.incident_id === taskId
            ? { ...state.activeTask, node_status: 'MAINTENANCE' }
            : state.activeTask
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to check in on-site.';
      throw new Error(msg);
    }
  },

  submitRepair: async (taskId, repairNotes) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskApi.submitRepair(taskId, repairNotes);

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.incident_id === taskId
            ? { ...t, status: 'PENDING_VERIFICATION', node_status: 'ACTIVE' }
            : t
        ),
        activeTask:
          state.activeTask?.incident_id === taskId
            ? {
                ...state.activeTask,
                status: 'PENDING_VERIFICATION',
                node_status: 'ACTIVE',
                pending_verification_since: res.data?.pending_verification_since
              }
            : state.activeTask,
        isLoading: false
      }));

      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to submit repair notes.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  checkVerification: async (taskId, evalData = {}) => {
    try {
      const res = await taskApi.verifyFlow(taskId, evalData);
      const { status, observed_lpm, remaining_seconds } = res.data;

      set((state) => ({
        verificationStates: {
          ...state.verificationStates,
          [taskId]: {
            status,
            observedLpm: observed_lpm,
            remainingSeconds: remaining_seconds ?? 0
          }
        }
      }));

      if (status === 'CLOSED_VERIFIED' || status === 'REPAIR_FAILED') {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.incident_id === taskId ? { ...t, status } : t
          ),
          activeTask:
            state.activeTask?.incident_id === taskId
              ? { ...state.activeTask, status }
              : state.activeTask
        }));
      }

      return res.data;
    } catch (err) {
      console.error(`[Verification Error] Failed for task ${taskId}:`, err.message);
      throw err;
    }
  },

  toggleDutyStatus: () => {
    set((state) => {
      const nextStatus = !state.isOnDuty;
      localStorage.setItem('aquila_tech_on_duty', JSON.stringify(nextStatus));
      return { isOnDuty: nextStatus };
    });
  },

  resetTaskStore: () =>
    set({
      tasks: [],
      activeTask: null,
      isLoading: false,
      error: null,
      verificationStates: {}
    })
}));