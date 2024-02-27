export function getData() {
  return  new Promise((resolve, reject) => {

        // 异步操作
        setTimeout(() => {
            const data = [
                { id: Math.random(), name: '美国', value: designatedNum() },
                { id: Math.random(), name: '中国', value: designatedNum() },
                { id: Math.random(), name: '巴西', value: designatedNum() },
                { id: Math.random(), name: '日本', value: designatedNum() },
                { id: Math.random(), name: '德国', value: designatedNum() }];

                resolve(data);
        });

        
    });
};



export function designatedNum(min = 200, max = 1000) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};