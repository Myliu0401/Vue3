/*  

   谈谈对vite的理解，最好对比webpack说明

      webpack的原理：
        通过入口文件，找到所有依赖，并将其打包压缩，最后搭建服务器，通过服务器就能访问到打包压缩后的代码。
        热更新，更新的文件，该文件中所有依赖的文件也会跟着重新打包。


      vite的原理：
         vite直接搭建服务器，当访问服务器时，服务器获取某个文件然后进行相应的编译，编译后将文件返回出去。
         vite比webpack少了打包压缩，webpack是对所有文件进行打包压缩的，而是访问者要哪个就对哪个文件进行编译后返回。
         所以vite页面的script标签是type="module"类型的。



      webpack会先打包，然后启动开发服务器，请求服务器时直接给予打包结果。
      而vite是直接启动开发服务器，请求哪个模块再对该模块进行实时编译。
      由于现代浏览器本身支持ES Module，会自动向依赖的Module发出请求。vite充分利用这一点，将开发环境下
       的模块文件，作为浏览器要执行的文件，而不是像webpack那样进行打包合并。
      由于vite在启动的时候不需要打包，也就疑问着不需要分析模块依赖、不需要编译，因此启动速度非常快。
      当浏览器请求某个模块时，再根据需要对模块内容进行编译，这种按需动态编译的方式，极大的缩减了编译时间，项目月复杂、模块越多，vite的优势越明显。
      在热更新方面，当改动了一个模块后，仅需让浏览器重新请求该模块即可，不像webpack那样需要把该模块的相关依赖模块全部编译一次，效率更高。
      当需要打包到生产环境时，vite使用传统的rollup进行打包，因此，vite的主要优势在开发阶段。另外，由于vite利用的是ES Module，因此在代码中不可以使用CommonJs。
     


*/