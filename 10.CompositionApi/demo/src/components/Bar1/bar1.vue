<template>
    <div class="content_bar">
        {{ data }}
    </div>
</template>


<script>
import useGdps from '../../composition/useGdp.js';
import { computed } from 'vue';
export default {
   props: {
       gdps: {  
          default(){
            return []
          }
       }
   },
   setup(props, cxt) {
       
       const gdpsRef = computed(()=>{
           return props.gdps;
       });

       const dataRef = computed(()=>{
           return gdpsRef.value.map(item=>item.value)
       });


       return {
         ...useGdps(gdpsRef)
       }
   },

   
}
</script>


<style scoped lang="less">

</style>