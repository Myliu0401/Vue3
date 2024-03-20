// 开始
    /*  async start(type) {
      let obj = null;

      // 判断是否已结束
      if (type === "physiotherapy" && this.canvasTherapyInfo.isEnded) {
        wx.showToast({ title: "理疗已结束不能继续", icon: "none" });
        return;
      } else if (type === "heat" && this.canvasHeatingInfo.isEnded) {
        wx.showToast({ title: "加热已结束不能继续", icon: "none" });
        return;
      }

      // 获取对应的数据
      if (type === "physiotherapy") {
        obj = this.canvasTherapyInfo;
      } else {
        obj = this.canvasHeatingInfo;
      }

      this.isLock = false;
      clearTimeout(this.lockId);
      if (type === "physiotherapy") {
        await this.startPhysicalTherapy(true); // 开始理疗
      } else {
        await this.startHeating(true); // 开始加热
      }
      this.lockup();

      //  判断是否是首次或者是点两次开始按键
      if (obj.start || obj.first) {
        if (type === "physiotherapy") {
          this.canvasTherapyInfo.time =
            this.canvasTherapyInfo.reallyUsingTime * 60;
        } else {
          this.canvasHeatingInfo.time =
            this.canvasHeatingInfo.reallyUsingTime * 60;
        }
      }
      obj.start = true; // 修改是否进行中
      obj.first = false; // 修改是否第一次
    }, */

    // 暂停
    /* suspend(type) {
      const bol = this.redundant(type, "suspend"); // 冗余代码，判断边界
      if (bol) {
        return;
      }

      const obj =
        type === "physiotherapy"
          ? this.canvasTherapyInfo
          : this.canvasHeatingInfo; // 获取对应的数据

      type === "physiotherapy"
        ? this.suspendPhysicalTherapy(true, "01")
        : this.pauseHeating(true, "01"); // 执行对应的暂停代码

      this.isLock = false;
      this.lockup();
      obj.start = !obj.start; // 修改状态
    }, */

    // 冗余
    /* redundant(type, kty) {
      let tips = null; // 提示文本
      let isBol = false; // 是否不可以调用接口
      const obj =
        type === "physiotherapy"
          ? this.canvasTherapyInfo
          : this.canvasHeatingInfo; // 获取对应的数据

      if (kty === "start" && obj.start) {
        // 已在进行中
        tips = type === "physiotherapy" ? "正在理疗中" : "正在加热中";
        isBol = true;
      } else if (kty === "suspend" && !obj.start) {
        // 已在暂停中
        tips = type === "physiotherapy" ? "理疗暂停中" : "加热暂停中";
        isBol = true;
      } else if (kty === "start" && !obj.start) {
        // 开启
        tips = type === "physiotherapy" ? "理疗已开始" : "加热暂已开始";
      } else if (kty === "suspend" && obj.start) {
        // 暂停
        tips = type === "physiotherapy" ? "理疗已暂停" : "加热暂已暂停";
      }

      if (obj.isEnded) {
        tips = type === "physiotherapy" ? "理疗已结束" : "加热已结束";
        isBol = true;
      }

      // 判断是否需要进行提示
      isBol &&
        wx.showToast({
          title: tips,
          icon: "none",
        });

      return isBol;
    }, */


     // 开始理疗
    /* async startPhysicalTherapy(bol = true) {
      // 开始理疗
      bol && (await this.therapyRedundancy("02"));

      this.clearTherapyTimer(); // 清除定时器

      this.canvasTherapyInfo.isEnded = false;

      // 切换图片
      this.canvasTherapyInfo.imgTimerNum = setInterval(() => {
        this.canvasTherapyInfo.imgNum =
          ++this.canvasTherapyInfo.imgNum % 13 || 1;
      }, 500);

      // 切换文本 开启 倒计时
      this.canvasTherapyInfo.casTimer = setInterval(async () => {
        this.canvasTherapyInfo.time--;
        this.canvasTherapyInfo.timeUsed++;
        this.canvasTherapyInfo.minute = Math.floor(
          this.canvasTherapyInfo.time / 60
        );
        // 清除定时器
        if (this.canvasTherapyInfo.time <= 0) {
          this.canvasTherapyInfo.isEnded = true;
          this.canvasTherapyInfo.start = false;
          this.canvasTherapyInfo.first = true;
         // this.canvasTherapyInfo.reallyUsingTime = 0;
          await this.suspendPhysicalTherapy(true, "00", "理疗已结束");
          if (
            this.canvasTherapyInfo.isEnded &&
            this.canvasHeatingInfo.isEnded && 
            this.canvasTherapyInfo.timeUsed > 0 && 
            this.canvasHeatingInfo.timeUsed > 0
          ) {
           await this.deleteDevice(); // 删除设备
            this.previousPage(); // 返回上一页
            this.disconnectDevice(); // 断开设备连接
          }
        }
      }, 1000);

      wx.showToast({ title: "理疗已开始", icon: "none" });
    }, */

    // 暂停/停止 理疗
    /* async suspendPhysicalTherapy(bol = false, num = "01", text = "理疗已暂停") {
      // 暂停理疗
      bol && (await this.therapyRedundancy(num));

      this.clearTherapyTimer(); // 清除定时器

      this.$toast.showToast(text);
    }, */

    // 理疗请求的冗余代码
   /*  therapyRedundancy(instruct) {
      return this.$getData("/devices/treatment", "post", {
        devicecode: this.devicecode,
        instruct,
      });
    }, */

    // 开始加热
    /* async startHeating(bol = true) {
      // 开始加热
      bol && (await this.heatingRedundancy("02"));

      this.clearHeatingTimer(); // 清除定时器

      this.canvasHeatingInfo.isEnded = false;

      // 切换图片
      this.canvasHeatingInfo.imgTimerNum = setInterval(() => {
        this.canvasHeatingInfo.imgNum =
          ++this.canvasHeatingInfo.imgNum % 7 || 1;
      }, 500);

      // 切换文本 开启 倒计时
      this.canvasHeatingInfo.casTimer = setInterval(async () => {
        this.canvasHeatingInfo.time--;
        this.canvasHeatingInfo.timeUsed++;
        this.canvasHeatingInfo.minute = Math.floor(
          this.canvasHeatingInfo.time / 60
        );
        if (this.canvasHeatingInfo.time <= 0) {
          this.canvasHeatingInfo.isEnded = true;
          this.canvasHeatingInfo.start = false;
          this.canvasHeatingInfo.first = true;
          // this.canvasHeatingInfo.reallyUsingTime = 0;
          await this.pauseHeating(true, "00", "加热已结束");
          if (
            this.canvasTherapyInfo.isEnded &&
            this.canvasHeatingInfo.isEnded &&
            this.canvasTherapyInfo.timeUsed > 0 &&
            this.canvasHeatingInfo.timeUsed > 0
          ) {
            await this.deleteDevice(); // 删除设备
            this.previousPage(); // 返回上一页
            this.disconnectDevice(); // 断开设备连接
          }
        }
      }, 1000);

      this.$toast.showToast("加热已开始");
    }, */

    // 暂停/停止 加热
    /* async pauseHeating(bol = false, num = "01", text = "加热已暂停") {
      bol && (await this.heatingRedundancy(num));
      this.clearHeatingTimer(); // 清除定时器
      this.$toast.showToast(text);
    }, */

    // 加热请求的冗余代码
    /* heatingRedundancy(instruct) {
      return this.$getData("/devices/heatstartwork", "post", {
        devicecode: this.devicecode,
        user_id: this.user_id,
        instruct,
      });
    }, */


