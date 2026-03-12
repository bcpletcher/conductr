import { ipcMain, BrowserWindow } from 'electron'
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
import { getActivityLog, addActivityLog } from '../db/documents'
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
      await runTask(taskId, onLog, onProgress)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onLog(`Error: ${msg}`)
      updateTaskStatus(taskId, 'failed')
      mainWindow.webContents.send('tasks:statusUpdate', { taskId, status: 'failed' })
    }

    return getTaskById(taskId)
  })
}
