import { ref } from 'vue';
import { addTask, removeTask, setTask } from '../utils/request.js';

// 操作任务
export default function useOperationalTasks(taskList){
     
    const taskNameRef = ref(null);

    // 添加任务
    const myAddTask = (e)=>{
         const value = taskNameRef.value && taskNameRef.value.trim();

         if(!value){
            return
         };

         const obj = {
            name: value,
             completed: false,
             id: Date.now() + Math.random().toString(32).slice(3,7)
         };

         taskList.push(obj);

         taskNameRef.value = null;
         e.target.blur();
         addTask(obj);
    };

    // 删除任务
    const myRemoveTask = (id)=>{
        const index = taskList.map((item)=>{ return item.id }).indexOf(id);
        taskList.splice(index, 1);
        removeTask(id);
    };

    
  
    // 修改任务
    const mySetTask = (id)=>{
        const index = taskList.map((item)=>{ return item.id }).indexOf(id);
        setTask(id, { name: taskList[index].name });
    };

    // 修改任务是否已完成
    const mySetTaskCompleted = (id)=>{
        const index = taskList.map((item)=>{ return item.id }).indexOf(id);
        taskList[index].completed = !taskList[index].completed;
        setTask(id, { completed: !taskList[index].completed });
    };

       
    return {
        taskName: taskNameRef,
        myAddTask,
        myRemoveTask,
        mySetTask,
        mySetTaskCompleted
    }


};