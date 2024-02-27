

// 获取列表
export function getList(){
   const lists = localStorage.getItem('taskList') ? JSON.parse(localStorage.getItem('taskList')) : [];
   
   return lists;
};

// 添加任务
export function addTask(task){
    const lists = localStorage.getItem('taskList') ? JSON.parse(localStorage.getItem('taskList')) : [];
    lists.push(task);
    localStorage.setItem('taskList', JSON.stringify(lists));
};

// 删除任务
export function removeTask(id){
    const lists = localStorage.getItem('taskList') ? JSON.parse(localStorage.getItem('taskList')) : [];
    
    const index = lists.map((item)=>{ return item.id }).indexOf(id);

    lists.splice(index, 1);

    localStorage.setItem('taskList', JSON.stringify(lists));
};

// 修改任务
export function setTask(id, task = {}){
    const lists = localStorage.getItem('taskList') ? JSON.parse(localStorage.getItem('taskList')) : [];

    const index = lists.map((item)=>{ return item.id }).indexOf(id);

    let myTask = lists[index];

    lists[index] = Object.assign(myTask, task);

    localStorage.setItem('taskList', JSON.stringify(lists));
};

