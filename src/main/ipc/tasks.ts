import { ipcMain, BrowserWindow, Notification } from 'electron'
import {
  getAllTasks,
  getTasksByStatus,
  getTaskById,
  createTask,
  updateTaskStatus,
  updateTaskProgress,
  deleteTask,
  getTaskCounts
} from '../db/tasks'
import { getActivityLog, addActivityLog, createDocument } from '../db/documents'
import { createJournalEntry } from '../db/journal'
import { runTask } from '../../agents/runner'

export function registerTaskHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('tasks:getAll', () => getAllTasks())

  ipcMain.handle('tasks:getByStatus', (_e, status: string) => getTasksByStatus(status))

  ipcMain.handle('tasks:getById', (_e, id: string) => getTaskById(id))

  ipcMain.handle('tasks:create', (_e, input) => createTask(input))

  ipcMain.handle('tasks:updateStatus', (_e, id: string, status: string, progress?: number) =>
    updateTaskStatus(id, status as 'queued' | 'active' | 'complete' | 'failed', progress)
  )

  ipcMain.handle('tasks:updateProgress', (_e, id: string, progress: number) =>
    updateTaskProgress(id, progress)
  )

  ipcMain.handle('tasks:delete', (_e, id: string) => deleteTask(id))

  ipcMain.handle('tasks:getCounts', () => getTaskCounts())

  ipcMain.handle('tasks:getActivityLog', (_e, taskId?: string) => getActivityLog(taskId))

  ipcMain.handle('tasks:start', async (_e, taskId: string) => {
    const onLog = (message: string) => {
      addActivityLog({ task_id: taskId, message })
      mainWindow.webContents.send('tasks:logUpdate', { taskId, message })
    }

    const onProgress = (progress: number) => {
      updateTaskProgress(taskId, progress)
      mainWindow.webContents.send('tasks:progressUpdate', { taskId, progress })
    }

    try {
      const { content } = await runTask(taskId, onLog, onProgress)
      mainWindow.webContents.send('tasks:statusUpdate', { taskId, status: 'complete' })

      // Native OS notification for task completion
      const completedTask = getTaskById(taskId)
      if (Notification.isSupported()) {
        new Notification({
          title: 'Task Complete',
          body: completedTask?.title ?? 'A task has finished successfully',
          silent: false,
        }).show()
      }

      // Phase 5: Auto-save document + journal entry from task output
      const task = getTaskById(taskId)
      if (task && content) {
        const doc = createDocument({
          title: `Output: ${task.title}`,
          content,
          task_id: taskId,
          agent_id: task.agent_id || undefined,
          client_id: task.client_id || undefined,
          tags: ['auto-generated', 'task-output'],
          doc_type: 'output',
        })

        mainWindow.webContents.send('documents:created', { document: doc })

        createJournalEntry({
          title: `Task completed: ${task.title}`,
          content: `Task "${task.title}" completed.\n\nAgent: ${task.agent_id || 'Unassigned'}\n\nOutput preview:\n${content.slice(0, 500)}${content.length > 500 ? '…' : ''}`,
          entry_type: 'task_complete',
          task_id: taskId,
          agent_id: task.agent_id || undefined,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onLog(`Error: ${msg}`)
      updateTaskStatus(taskId, 'failed')
      mainWindow.webContents.send('tasks:statusUpdate', { taskId, status: 'failed' })

      // Native OS notification for task failure
      const failedTask = getTaskById(taskId)
      if (Notification.isSupported()) {
        new Notification({
          title: 'Task Failed',
          body: failedTask?.title ?? 'A task encountered an error',
          silent: true,
          urgency: 'critical',
        }).show()
      }
    }

    return getTaskById(taskId)
  })
}
