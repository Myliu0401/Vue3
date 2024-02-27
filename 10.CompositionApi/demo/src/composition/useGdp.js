import { computed } from 'vue';

export default function useGdps(gdps) {
      
      const dataRef = computed(()=>{
       console.log('++')
           if(!gdps.value){
                 return [];
           }
           return gdps.value.map(()=>{
                    return {

                    };              
           });
      });
console.log(dataRef)
      return {
         data: dataRef
      }
};