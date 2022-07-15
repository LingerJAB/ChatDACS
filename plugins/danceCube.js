/**
 * authorization.token 文件内容为玩家账户密钥，向服务器请求数据时会携带该参数鉴权，具有修改账户的最高权限，需要自行抓包获取，请勿透露给不信任的他人，否则最糟糕的情况可能会导致游戏账户被恶意注销
 */

module.exports = {
  插件名: "公测·舞立方信息查询插件",
  指令: "^[/!]?(绑定|个人信息|战绩|机台状态|关注机台|我要出勤)(.*)",
  版本: "1.2",
  作者: "Giftina",
  描述: "舞立方信息查询，可以查询玩家信息以及机台状态。数据来源以及素材版权归属 胜骅科技 https://www.arccer.com/ ，如有侵权请联系作者删除。",
  使用示例: "个人信息",
  预期返回: "[炫酷的舞立方个人信息图片]",

  execute: async function (msg, userId, userName, groupId, groupName, options) {
    let reply = "";
    const args = msg.split(" ") ?? [];

    // 绑定
    if (bindCommand.test(msg)) {
      const playerId = args[1];
      if (!playerId) {
        return { type: "text", content: "好像没有输入舞立方账号呢，绑定指令类似这样：绑定 823258" };
      }
      reply = await BindUser(userId, playerId);
    }
    // 个人信息
    else if (getPlayerInfoCommand.test(msg)) {
      let playerId = args[1];

      // 如果没有携带 playerId 参数，则查询用户有没有绑定玩家，没有则提示绑定
      const playerData = await DanceCubeModel.findOne({ where: { userId } });
      if (!playerId) {
        if (!playerData) {
          return { type: "text", content: errorNoData };
        } else {
          playerId = playerData.playerId;
        }
      }

      reply = await AnalysisPlayerInfo(playerId);
      return reply;
    }
    // 战绩
    else if (getRankCommand.test(msg)) {
      let playerId = args[1];

      // 如果没有携带 playerId 参数，则查询用户有没有绑定玩家，没有则提示绑定
      const playerData = await DanceCubeModel.findOne({ where: { userId } });
      if (!playerId) {
        if (!playerData) {
          return { type: "text", content: errorNoData };
        } else {
          playerId = playerData.playerId;
        }
      }

      const musicIndex = args[2] || defaultMusicIndex;
      const playerRank = await GetPlayerRank(playerId, musicIndex);
      if (playerRank.error) {
        reply = `查询战绩失败：${playerRank.error}`;
      } else {
        reply = playerRank;
      }
    }
    // 机台状态
    else if (getMachineStateCommand.test(msg)) {
      let province = args[1];
      let city = province?.includes("市") ? "市辖区" : args[2];

      // 如果没有携带参数，则从绑定信息中获取，没有则提示绑定
      const playerData = await DanceCubeModel.findOne({ where: { userId } });
      if (!args[1]) {
        if (!playerData) {
          return { type: "text", content: errorNoData };
        } else {
          const location = await AnalysisLocation(playerData.location);
          console.log(`将绑定信息地址 ${playerData.location} 解析为 ${location.province + " " + location.city}`.log);
          if (!location) {
            return { type: "text", content: "解析你的地区失败了，对不起呀，你还可以手动查询，指令如：机台状态 浙江省 杭州市" };
          } else {
            province = location.province;
            city = location.city;
          }
        }
      }

      if (!province || !city) {
        return { type: "text", content: "没有正确指定省份或城市噢，正确指令如：机台状态 浙江省 杭州市，市辖区示例：机台状态 上海市" };
      }

      const machineListByPlace = await GetMachineListByPlace(province, city);
      if (machineListByPlace.error) {
        reply = `查询机台状态失败：${machineListByPlace.error}`;
      } else {
        reply = machineListByPlace;
      }
    }
    // 关注机台
    else if (focusMachineCommand.test(msg)) {
      // 如果没有携带 playerId 参数，则查询用户有没有绑定玩家，没有则提示绑定
      const playerData = await DanceCubeModel.findOne({ where: { userId } });
      if (!playerData) {
        return { type: "text", content: errorNoData };
      }
      // 如果没有指定机台ID，需要引导用户输入机台ID
      else if (!args[1]) {
        return { type: "text", content: "好像没有指定机台ID噢，请发送 机台状态 指令来查询你附近的机台的ID吧" };
      }

      const machineId = args[1];
      const machineFocused = await FocusMachine(userId, machineId);
      if (machineFocused.error) {
        reply = `关注机台失败：${machineFocused.error}`;
      } else {
        reply = machineFocused;
      }
    }
    // 我要出勤
    else if (goGoGOCommand.test(msg)) {
      // 查询用户关注的机台状态，如果没有关注机台，则提示用户关注机台
      const playerData = await DanceCubeModel.findOne({ where: { userId } });
      if (!playerData) {
        return { type: "text", content: errorNoData };
      } else if (!playerData.focusMachine) {
        return { type: "text", content: "你还没有关注机台呢，禁止出勤，请发送 机台状态 来查询你附近的机台的ID吧" };
      }

      const couldGoGoGo = await GoGoGo(userId);
      if (couldGoGoGo.error) {
        reply = `出勤失败：${couldGoGoGo.error}`;
      } else {
        reply = couldGoGoGo;
      }
    }

    return { type: "text", content: reply };
  },
};

const bindCommand = new RegExp(/^[/!]?绑定(.*)/);
const getPlayerInfoCommand = new RegExp(/^[/!]?个人信息(.*)/);
const getRankCommand = new RegExp(/^[/!]?战绩(.*)/);
const getMachineStateCommand = new RegExp(/^[/!]?机台状态(.*)/);
const focusMachineCommand = new RegExp(/^[/!]?关注机台(.*)/);
const goGoGOCommand = new RegExp(/^[/!]?我要出勤/);

const defaultMusicIndex = 6; // 音乐类型，1 最新，2 国语，3 粤语，4 韩文，5 欧美，6 其他
const errorNoData = "你还没有绑定舞立方账号呢，请使用指令 绑定 玩家ID 来绑定你的舞立方账号";

const { createCanvas, loadImage, registerFont } = require("canvas"); // 用于绘制文字图像，迫害p图
const path = require("path");
const fs = require("fs");
const axios = require("axios").default;
const authorization = fs.readFileSync(
  path.join(__dirname, "danceCube", "authorization.token"),
  "utf-8",
  function (err, data) {
    if (!err) {
      return data;
    }
  },
);
const baseURL = "https://dancedemo.shenghuayule.com/";
const headers = {
  "Authorization": authorization,
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Html5Plus/1.0 (Immersed/44) uni-app",
  "Host": "dancedemo.shenghuayule.com",
  "Referer": baseURL,
};
const api = {
  playerInfo: baseURL + "Dance/api/User/GetInfo",
  playerRank: baseURL + "Dance/api/User/GetMyRank",
  machineList: baseURL + "Dance/OAuth/GetMachineList",
  machineListByPlace: baseURL + "Dance/OAuth/GetMachineListByPlace",
};
//加载字体
const titleFontName = "优设标题圆";
registerFont(path.join(__dirname, "danceCube", "assets", "YouSheBiaoTiYuan.otf"), { family: titleFontName });
const infoFontName = "霞鹜新晰黑";
registerFont(path.join(__dirname, "danceCube", "assets", "LXGWNewClearGothic-Book.ttf"), { family: infoFontName });
const eventFontName = "江城知音体";
registerFont(path.join(__dirname, "danceCube", "assets", "JiangChengZhiYingTi600W.ttf"), { family: eventFontName });

/**
 * 玩家绑定
 * @param {string} userId 用户id
 * @param {string} playerId 玩家id
 */
async function BindUser(userId, playerId) {
  const playerInfo = await GetPlayerInfo(playerId);
  if (playerInfo.error) {
    return `获取玩家资料失败：${playerInfo.error}`;
  }

  await DanceCubeModel.upsert({
    userId,
    playerId,
    playerName: playerInfo.UserName,
    location: playerInfo.CityName,
  }, {
    where: {
      userId,
    }
  });
  return `绑定成功，现在你绑定的账号是 ${playerInfo.UserName}`;
}

/**
 * 解析玩家信息，绘制成炫酷的个人信息图
 * @param {string} playerId 玩家id
 */
async function AnalysisPlayerInfo(playerId) {
  const playerInfo = await GetPlayerInfo(playerId);
  if (playerInfo.error) {
    return { type: "text", content: `获取玩家资料失败：${playerInfo.error}` };
  }

  const headImg = playerInfo.HeadimgURL;
  const headImgBox = playerInfo.HeadimgBoxPath;
  const playerName = playerInfo.UserName;
  const sex = playerInfo.Sex == 1 ? "♂" : "♀";
  const teamName = playerInfo.TeamName ?? "未加入";
  const playerLevel = playerInfo.LvRatio;
  const rankNation = playerInfo.RankNation;
  const points = playerInfo.MusicScore;
  const fullComboPercent = playerInfo.ComboPercent / 100 + "%";
  const cursorSpeed = playerInfo.MusicSpeed;

  const info = `战队：${teamName ?? "未加入"}
战力值：${playerLevel}
全国排行：${rankNation}
个人积分：${points}
全连率：${fullComboPercent}
光标速度：${cursorSpeed}`;

  // 开始绘制图片
  // 加载头像和头像框，以及背景图
  const headImgBuffer = await loadImage(headImg);
  const headImgBoxBuffer = headImgBox ? await loadImage(headImgBox) : null;
  const sexIcon = sex == "♀" ? "xx_zdsq-nv.png" : "xx_zdsq_nan.png";
  const sexIconBuffer = await loadImage(path.join(__dirname, "danceCube", "assets", sexIcon));
  const backgroundImgBuffer = await loadImage(path.join(__dirname, "danceCube", "assets", "ui_sjd_zltc_01.png"));

  const canvas = createCanvas(backgroundImgBuffer.width, backgroundImgBuffer.height);
  const ctx = canvas.getContext("2d");

  // 绘制背景图
  ctx.drawImage(backgroundImgBuffer, 0, 0);

  // 在中上位置绘制头像
  const headImgLeft = backgroundImgBuffer.width / 2 - 55;
  const headImgTop = 75;
  const headImgWidth = 120;
  const headImgHeight = 120;
  ctx.drawImage(headImgBuffer, headImgLeft, headImgTop, headImgWidth, headImgHeight);

  // 在头像上面绘制头像框
  if (headImgBox) {
    const headImgBoxLeft = headImgLeft - 65;
    const headImgBoxTop = headImgTop - 65;
    const headImgBoxWidth = headImgWidth + 130;
    const headImgBoxHeight = headImgHeight + 130;
    ctx.drawImage(headImgBoxBuffer, headImgBoxLeft, headImgBoxTop, headImgBoxWidth, headImgBoxHeight);
  }

  // 在头像正下方绘制玩家名，♂蓝，♀粉
  ctx.font = `60px '${eventFontName}'`;
  ctx.fillStyle = sex === "♂" ? "LightBlue" : "LightPink";
  ctx.textAlign = "center";
  ctx.fillText(playerName, headImgLeft + headImgWidth / 2, headImgTop + headImgHeight + 120);

  // 在玩家名正下方绘制性别图标
  ctx.drawImage(sexIconBuffer, headImgLeft + headImgWidth / 2 - 10, headImgTop + headImgHeight + 150, 30, 30);

  // 在玩家名下方绘制玩家信息
  ctx.font = `30px '${eventFontName}'`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(info, headImgLeft + headImgWidth / 2, headImgTop + headImgHeight + 250);

  // 右下角版权信息
  ctx.font = `10px '${eventFontName}'`;
  ctx.fillStyle = "rgba(99, 99, 99, 0.6)";
  ctx.textAlign = "center";
  ctx.fillText("CopyRight 胜骅科技", canvas.width - 60, canvas.height - 18);
  ctx.fillText("Design By Giftina", canvas.width - 60, canvas.height - 8);

  // 整屏加个半透明水印
  ctx.font = `160px '${eventFontName}'`;
  ctx.fillStyle = "rgba(99, 99, 99, 0.2)";
  ctx.textAlign = "center";
  ctx.fillText("公  测", canvas.width / 2, canvas.height / 2 + 80);

  // 保存图片
  const fileName = `${playerId}.png`;
  const filePath = path.join(process.cwd(), "static", "xiaoye", "images", fileName);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);

  const fileURL = `/xiaoye/images/${fileName}`;

  return { type: "picture", content: { file: fileURL } };
}

/**
 * 查询玩家Json信息
 * @param {string} playerId 玩家id
 */
async function GetPlayerInfo(playerId) {
  const playerInfo = await axios.get(api.playerInfo, {
    headers: headers,
    params: {
      userId: playerId,
    },
    validateStatus: (status) => status < 500,
  })
    .then(async function (response) {
      if (response.status !== 200) {
        return { error: response.data.Message };
      }
      return response.data;
    })
    .catch((error) => {
      console.log(`获取玩家资料失败: ${error}`.error);
      return { error };
    });
  return playerInfo;
}

/**
 * 查询玩家战绩，绘制成炫酷的结算图
 * @param {string} playerId 玩家id
 * @param {string} musicIndex 音乐类型，1 最新，2 国语，3 粤语，4 韩文，5 欧美，6 其他
 */
async function GetPlayerRank(playerId, musicIndex) {
  const playerRank = await axios.get(api.playerRank, {
    headers: headers,
    params: {
      musicIndex: musicIndex,
      userId: playerId,
    },
    validateStatus: (status) => status < 500,
  })
    .then(async function (response) {
      if (response.status !== 200) {
        return { error: response.data.Message };
      }
      const results = response.data;
      const reply = results.map((result) => {
        const musicName = result.Name;
        const record = result.LvRecord;
        return `${musicName} ${record}`;
      });
      return reply.join("\n");
    })
    .catch(function (error) {
      console.log(`获取玩家战绩失败: ${error}`.error);
      return "获取玩家战绩失败: ", error;
    });

  const playerInfo = await GetPlayerInfo(playerId);
  if (playerInfo.error) {
    return `获取玩家资料失败：${playerInfo.error}`;
  }

  const headImg = playerInfo.HeadimgURL;
  const headImgBox = playerInfo.HeadimgBoxPath;
  const playerName = playerInfo.UserName;
  const sex = playerInfo.Sex == 1 ? "♂" : "♀";
  const teamName = playerInfo.TeamName ?? "未加入";
  const playerLevel = playerInfo.LvRatio;
  const rankNation = playerInfo.RankNation;
  const points = playerInfo.MusicScore;
  const fullComboPercent = playerInfo.ComboPercent / 100 + "%";
  const cursorSpeed = playerInfo.MusicSpeed;

  const info = `${playerName} ${sex}
  战队：${teamName ?? "未加入"}
  战力值：${playerLevel}
  全国排行：${rankNation}
  个人积分：${points}
  全连率：${fullComboPercent}
  光标速度：${cursorSpeed}`;

  // 开始绘制图片
  // 加载头像和头像框，以及背景图
  const headImgBuffer = await loadImage(headImg);
  const headImgBoxBuffer = headImgBox ? await loadImage(headImgBox) : null;
  const sexIcon = sex == "♀" ? "xx_zdsq-nv.png" : "xx_zdsq_nan.png";
  const sexIconBuffer = await loadImage(path.join(__dirname, "danceCube", "assets", sexIcon));
  const backgroundImgBuffer = await loadImage(path.join(__dirname, "danceCube", "assets", "background.png"));

  const canvas = createCanvas(backgroundImgBuffer.width, backgroundImgBuffer.height);
  const ctx = canvas.getContext("2d");

  // 绘制背景图
  ctx.drawImage(backgroundImgBuffer, 0, 0);

  // 绘制头像
  const headImgLeft = 100;
  const headImgTop = 260;
  const headImgWidth = 70;
  const headImgHeight = 70;
  ctx.drawImage(headImgBuffer, headImgLeft, headImgTop, headImgWidth, headImgHeight);

  // 在头像上面绘制头像框
  if (headImgBox) {
    const headImgBoxLeft = headImgLeft - 35;
    const headImgBoxTop = headImgTop - 35;
    const headImgBoxWidth = headImgWidth + 70;
    const headImgBoxHeight = headImgHeight + 70;
    ctx.drawImage(headImgBoxBuffer, headImgBoxLeft, headImgBoxTop, headImgBoxWidth, headImgBoxHeight);
  }

  // 在头像正下方绘制玩家名，♂蓝，♀粉
  ctx.font = `20px '${eventFontName}'`;
  ctx.fillStyle = sex === "♂" ? "LightBlue" : "LightPink";
  ctx.textAlign = "center";
  ctx.fillText(playerName, headImgLeft + headImgWidth / 2, headImgTop + headImgHeight + 30);

  // 在玩家名正下方绘制性别图标
  ctx.drawImage(sexIconBuffer, headImgLeft + headImgWidth / 2 - 10, headImgTop + headImgHeight + 40, 20, 20);

  // 在玩家名下方绘制玩家信息
  ctx.font = `20px '${eventFontName}'`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(info, headImgLeft + headImgWidth / 2, headImgTop + headImgHeight + 90);

  // 中上位置展示置顶战绩
  ctx.font = `50px '${titleFontName}'`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("战绩", canvas.width / 2, 180);

  // 右下角版权信息
  ctx.font = `10px '${eventFontName}'`;
  ctx.fillStyle = "#555555";
  ctx.textAlign = "center";
  ctx.fillText("CopyRight 胜骅科技", canvas.width - 50, canvas.height - 20);
  ctx.fillText("Design By Giftina", canvas.width - 50, canvas.height - 10);

  // 整屏加个半透明水印
  ctx.font = `170px '${eventFontName}'`;
  ctx.fillStyle = "rgba(33, 33, 33, 0.4)";
  ctx.textAlign = "center";
  ctx.fillText("公  测", canvas.width / 2, canvas.height / 2 + 80);

  // 保存图片
  const fileName = `${playerId}.png`;
  const filePath = path.join(__dirname, "danceCube", "user", fileName);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);

  return playerRank;
}

/**
 * 根据省市查询机台状态
 * @param {string} province 省
 * @param {string} city 市
 */
async function GetMachineListByPlace(province, city) {
  const machineList = await axios.get(api.machineListByPlace, {
    headers: headers,
    params: {
      province: province,
      city: city,
    },
    validateStatus: (status) => status < 500,
  })
    .then(async function (response) {
      if (response.status !== 200) {
        return { error: response.data.Message };
      }
      const machineList = response.data;
      const reply = machineList.map((machine) => {
        const machineName = machine.PlaceName.replace(/\n/g, "");
        const address = machine.Address.replace(/\n/g, "");
        const status = machine.Online ? "🟢" : "🔴";
        const machineGeneration = machine.Img1.includes("9700") ? "Ⅰ代" : "Ⅱ代"; // 按机台图片名判断其实不是很准确，但是大致看了下八九不离十
        const machineTerminalID = machine.MachineTerminalID;
        return `${status}${machineName} ${machineGeneration}\nID: ${machineTerminalID}\n${address}\n`;
      });
      return `${province}${city}机台状态：

${reply.join("\n")}
发送 关注机台 机台ID 可以关注机台
（机台在线状态和世代仅供参考，以实际状态为准）
`;
    })
    .catch(function (error) {
      console.log(`获取机台状态失败: ${error}`.error);
      return "获取机台状态失败: ", error;
    });
  return machineList;
}

/**
 * 根据 location 解析省市
 * @param {string} location 省市
 */
async function AnalysisLocation(location) {
  // 简陋的省份解析
  let province = location.split("省")[0];
  const city = location.split("省")[1];

  if (!province || !city) {
    return;
  }

  province += "省";
  return { province, city };
}

/**
 * 关注机台，后续出勤时直接查询该机台号
 * @param {string} machineTerminalID 机台号
 */
async function FocusMachine(userId, machineTerminalID) {
  // 先验证机台是否存在
  const machineInfo = await axios.get(api.machineList, {
    headers: headers,
    params: {
      onlyPassed: true,
      getUserInfo: false, // 舞立方点灯计划的点灯玩家
    },
    validateStatus: (status) => status < 500,
  })
    .then(async function (response) {
      if (response.status !== 200) {
        return { error: response.data.Message };
      }
      const machine = response.data.find((machine) => {
        return machine.MachineTerminalID === machineTerminalID;
      });
      return machine;
    })
    .catch(function (error) {
      console.log(`获取玩家资料失败: ${error}`.error);
      return "获取玩家资料失败: ", error;
    });

  if (!machineInfo) {
    return "这个机台不存在呢，是不是输错了呢，请发送 机台状态 指令来查询机台ID吧";
  }

  // 再获取机台位置
  const province = machineInfo.ProvinceAndCity.split(" ")[0];
  const city = machineInfo.ProvinceAndCity.split(" ")[1];

  await DanceCubeModel.update({
    focusMachine: {
      machineTerminalID: machineTerminalID,
      province: province,
      city: city,
    },
  }, {
    where: {
      userId: userId,
    }
  });

  return `关注成功，现在你关注的机台是 ${machineInfo.PlaceName}，发送 我要出勤 查询你关注的机台情况`;
}

/**
 * 查询出勤状态
 * @param {*} userId 用户id
 */
async function GoGoGo(userId) {
  /**
   * focusMachine: { machineTerminalID, province, city }
   */
  const { focusMachine } = await DanceCubeModel.findOne({
    where: {
      userId: userId,
    },
    attributes: ["focusMachine"],
  });

  const machine = await axios.get(api.machineListByPlace, {
    headers: headers,
    params: {
      province: focusMachine.province,
      city: focusMachine.city,
    },
    validateStatus: (status) => status < 500,
  })
    .then(async function (response) {
      if (response.status !== 200) {
        return { error: response.data.Message };
      }
      const machineList = response.data;
      const machine = machineList.find((machine) => {
        return machine.MachineTerminalID === focusMachine.machineTerminalID;
      });
      return machine;
    })
    .catch(function (error) {
      console.log(`获取机台状态失败: ${error}`.error);
      return "获取机台状态失败: ", error;
    });
  const machineName = machine.PlaceName.replace(/\n/g, "");
  const provinceAndCity = machine.ProvinceAndCity.replace(/\n/g, "");
  const address = machine.Address.replace(/\n/g, "");
  const longitudeAndLatitude = `${machine.Longitude}, ${machine.Latitude}`; // 经纬度
  const status = machine.Online ? "🟢机台在线，立即出勤" : "🔴机台离线，散了吧";
  const machineGeneration = machine.Img1.includes("9700") ? "Ⅰ代机" : "Ⅱ代机";
  const machinePicture1Link = `https://dancedemo.shenghuayule.com/Dance/${machine.Img1}`;
  const machinePicture2Link = `https://dancedemo.shenghuayule.com/Dance/${machine.Img2}`;
  return `${status}
${machineName} ${machineGeneration}
${provinceAndCity} ${address}
坐标：${longitudeAndLatitude}
[CQ:image,file=${machinePicture1Link}][CQ:image,file=${machinePicture2Link}]`;
}

const DanceCubeModel = require(path.join(process.cwd(), "plugins", "system", "model", "danceCubeModel.js"));
