import { useState, useEffect, useCallback } from 'react'

/**
 * 自定义 Hook：封装 LocalStorage 的读写操作
 */
export function useLocalStorage(key, initialValue) {
    // 初始化状态
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.error(`读取 LocalStorage 失败 (${key}):`, error)
            return initialValue
        }
    })

    // 更新 LocalStorage 的函数
    const setValue = useCallback((value) => {
        try {
            // 允许传入函数（类似 useState）
            const valueToStore = value instanceof Function ? value(storedValue) : value
            setStoredValue(valueToStore)
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
        } catch (error) {
            console.error(`写入 LocalStorage 失败 (${key}):`, error)
        }
    }, [key, storedValue])

    // 删除 LocalStorage 的函数
    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key)
            setStoredValue(initialValue)
        } catch (error) {
            console.error(`删除 LocalStorage 失败 (${key}):`, error)
        }
    }, [key, initialValue])

    return [storedValue, setValue, removeValue]
}
