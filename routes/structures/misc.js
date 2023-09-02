const settings = require("../../settings.json");
const fetch = require('node-fetch');
const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const fs = require("fs");
const log = require('../handlers/webhook')

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
  if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function (app, db) {
  app.get("/updateinfo", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/auth");
    const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
      .catch(() => {
        return res.send("An error has occured while attempting to update your account information and server list.");
      })
    if (!cacheaccount) return
    req.session.pterodactyl = cacheaccount.attributes;
    if (req.query.redirect) if (typeof req.query.redirect == "string") return res.redirect("/" + req.query.redirect);
    res.redirect("/dashboard");
  });

  const queue = new Queue()
  app.get("/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/auth");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.create == true) {
      queue.addJob(async (cb) => {
        let redirectlink = theme.settings.redirect.failedcreateserver ?? "/"; // fail redirect link

        const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
          .catch(() => {
            cb()
            return res.send("An error has occured while attempting to update your account information and server list.");
          })
        if (!cacheaccount) {
          cb()
          return res.send('Hola Client failed to find an account on the configured panel, try relogging')
        }
        req.session.pterodactyl = cacheaccount.attributes;

        if (req.query.name && req.query.ram && req.query.disk && req.query.cpu && req.query.egg && req.query.location) {
          try {
            decodeURIComponent(req.query.name)
          } catch (err) {
            cb()
            return res.redirect(`${redirectlink}?err=COULDNOTDECODENAME`);
          }

          let packagename = await db.get("package-" + req.session.userinfo.email);
          let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

          let extra =
            await db.get("extra-" + req.session.userinfo.email) ||
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };

          let ram2 = 0;
          let disk2 = 0;
          let cpu2 = 0;
          let servers2 = req.session.pterodactyl.relationships.servers.data.length;
          for (let i = 0, len = req.session.pterodactyl.relationships.servers.data.length; i < len; i++) {
            ram2 = ram2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.memory;
            disk2 = disk2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.disk;
            cpu2 = cpu2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.cpu;
          };

          if (servers2 >= package.servers + extra.servers) {
            cb()
            return res.redirect(`${redirectlink}?err=TOOMUCHSERVERS`);
          }

          let name = decodeURIComponent(req.query.name);
          if (name.length < 1) { 
            cb()
            return res.redirect(`${redirectlink}?err=LITTLESERVERNAME`);
          }
          if (name.length > 191) {
            cb()
            return res.redirect(`${redirectlink}?err=BIGSERVERNAME`);
          }

          let location = req.query.location;

          if (Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location).length !== 1) {
            cb()
            return res.redirect(`${redirectlink}?err=INVALIDLOCATION`);
          }

          let requiredpackage = Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location)[0][1].package;
          if (requiredpackage) if (!requiredpackage.includes(packagename ? packagename : newsettings.api.client.packages.default)) {
            cb()
            return res.redirect(`${redirectlink}?err=PREMIUMLOCATION`);
          }


          let egg = req.query.egg;

          let egginfo = newsettings.api.client.eggs[egg];
          if (!newsettings.api.client.eggs[egg]) {
            cb()
            return res.redirect(`${redirectlink}?err=INVALIDEGG`);
          }
          let ram = parseFloat(req.query.ram);
          let disk = parseFloat(req.query.disk);
          let cpu = parseFloat(req.query.cpu);
          if (!isNaN(ram) && !isNaN(disk) && !isNaN(cpu)) {
            if (ram2 + ram > package.ram + extra.ram) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDRAM&num=${package.ram + extra.ram - ram2}`);
            }
            if (disk2 + disk > package.disk + extra.disk) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDDISK&num=${package.disk + extra.disk - disk2}`);
            }
            if (cpu2 + cpu > package.cpu + extra.cpu) {
              cb()
              return res.redirect(`${redirectlink}?err=EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`);
            }
            if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
            }
            if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
            }
            if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) {
              cb()
              return res.redirect(`${redirectlink}?err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
            }
            if (egginfo.maximum) {
              if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
              }
              if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
              }
              if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) {
                cb()
                return res.redirect(`${redirectlink}?err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`)
              }
            }

            let specs = egginfo.info;
            specs["user"] = (await db.get("users-" + req.session.userinfo.id));
            if (!specs["limits"]) specs["limits"] = {
              swap: 0,
              io: 500,
              backups: 0
            };
            specs.name = name;
            specs.limits.swap = -1;
            specs.limits.memory = ram;
            specs.limits.disk = disk;
            specs.limits.cpu = cpu;
            if (!specs["deploy"]) specs.deploy = {
              locations: [],
              dedicated_ip: false,
              port_range: []
            }
            specs.deploy.locations = [location];
            
            // Make sure user has enough coins
            const createdServer = await db.get(`createdserver-${req.session.userinfo.email}`)
            const createdStatus = createdServer ?? false
            const coins = await db.get("coins-" + req.session.userinfo.email) ?? 0;
            const cost = settings.servercreation.cost
            if (createdStatus && coins < cost) {
              cb()
              return res.redirect(`/new?err=TOOLITTLECOINS`)
            }

            let serverinfo = await fetch(
              settings.pterodactyl.domain + "/api/application/servers",
              {
                method: "post",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
                body: JSON.stringify(await specs)
              }
            );
            await serverinfo
            if (serverinfo.statusText !== "Created") {
              console.log(await serverinfo.text());
              cb()
              return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
            }
            let serverinfotext = await serverinfo.json();
            let newpterodactylinfo = req.session.pterodactyl;
            newpterodactylinfo.relationships.servers.data.push(serverinfotext);
            req.session.pterodactyl = newpterodactylinfo;
            
            // Bill user if they have created a server before
            if (createdStatus) {
              await db.set("coins-" + req.session.userinfo.email, coins - cost)
            }

            await db.set(`lastrenewal-${serverinfotext.attributes.id}`, Date.now())
            await db.set(`createdserver-${req.session.userinfo.email}`, true)

            cb()
            log('created server', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} created a new server named \`${name}\` with the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``)
            return res.redirect("/new?err=CREATEDSERVER");
          } else {
            cb()
            res.redirect(`${redirectlink}?err=NOTANUMBER`);
          }
        } else {
          cb()
          res.redirect(`${redirectlink}?err=MISSINGVARIABLE`);
        }
      })
    } else {
      res.redirect(theme.settings.redirect.createserverdisabled ? theme.settings.redirect.createserverdisabled : "/");
    }
  });


  app.get("/modify", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.modify == true) {
      if (!req.query.id) return res.send("Missing server id.");

      const cacheaccount = await getPteroUser(req.session.userinfo.id, db)
        .catch(() => {
          return res.send("An error has occured while attempting to update your account information and server list.");
        })
      if (!cacheaccount) return
      req.session.pterodactyl = cacheaccount.attributes;

      let redirectlink = theme.settings.redirect.failedmodifyserver ? theme.settings.redirect.failedmodifyserver : "/"; // fail redirect link

      let checkexist = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id == req.query.id);
      if (checkexist.length !== 1) return res.send("Invalid server id.");

      let ram = req.query.ram ? (isNaN(parseFloat(req.query.ram)) ? undefined : parseFloat(req.query.ram)) : undefined;
      let disk = req.query.disk ? (isNaN(parseFloat(req.query.disk)) ? undefined : parseFloat(req.query.disk)) : undefined;
      let cpu = req.query.cpu ? (isNaN(parseFloat(req.query.cpu)) ? undefined : parseFloat(req.query.cpu)) : undefined;
      let allocations = req.query.allocations ? (isNaN(parseFloat(req.query.allocations)) ? undefined : parseFloat(req.query.allocations)) : undefined;
      let backups = req.query.backups ? (isNaN(parseFloat(req.query.backups)) ? undefined : parseFloat(req.query.backups)) : undefined;
      let databases = req.query.databases ? (isNaN(parseFloat(req.query.databases)) ? undefined : parseFloat(req.query.databases)) : undefined;

      if (ram || disk || cpu || allocations || backups || databases) {
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

        let packagename = await db.get("package-" + req.session.userinfo.email);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

        let pterorelationshipsserverdata = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id.toString() !== req.query.id);

        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        let allocations2 = 0;
        let backups2 = 0;
        let databases2 = 0;
        for (let i = 0, len = pterorelationshipsserverdata.length; i < len; i++) {
          ram2 = ram2 + pterorelationshipsserverdata[i].attributes.limits.memory;
          disk2 = disk2 + pterorelationshipsserverdata[i].attributes.limits.disk;
          cpu2 = cpu2 + pterorelationshipsserverdata[i].attributes.limits.cpu;
          databases2 = pterorelationshipsserverdata[i].attributes.feature_limits.databases;
          allocations2 = pterorelationshipsserverdata[i].attributes.feature_limits.allocations;
          backups2 = pterorelationshipsserverdata[i].attributes.feature_limits.backups;
        }
        let attemptegg = null;

        for (let [name, value] of Object.entries(newsettings.api.client.eggs)) {
          if (value.info.egg == checkexist[0].attributes.egg) {
            attemptegg = newsettings.api.client.eggs[name];
          };
        };
        let egginfo = attemptegg ? attemptegg : null;

        if (!egginfo) return res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGEGG`);

        let extra =
          await db.get("extra-" + req.session.userinfo.email) ?
            await db.get("extra-" + req.session.userinfo.email) :
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0,
              databases: 0,
              backups: 0,
              allocations: 0
            };

        if (ram2 + ram > package.ram + extra.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${package.ram + extra.ram - ram2}`);
        if (disk2 + disk > package.disk + extra.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${package.disk + extra.disk - disk2}`);
        if (cpu2 + cpu > package.cpu + extra.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`);
        if (backups2 + backups > package.backups + extra.backups) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDBACKUPS&num=${package.backups + extra.backups - backups2}`);
        if (allocations2 + allocations > package.allocations + extra.allocations) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDALLOCATIONS&num=${package.allocations + extra.allocations - allocations2}`);
        if (databases2 + databases > package.databases + extra.databases) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDATABASES&num=${package.databases + extra.databases - databases2}`);
        if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
        if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
        if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
        if (egginfo.maximum) {
          if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
          if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
          if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`);
        };

        let limits = {
          memory: ram ? ram : checkexist[0].attributes.limits.memory,
          disk: disk ? disk : checkexist[0].attributes.limits.disk,
          cpu: cpu ? cpu : checkexist[0].attributes.limits.cpu,
          swap: egginfo ? checkexist[0].attributes.limits.swap : 0,
          io: egginfo ? checkexist[0].attributes.limits.io : 500
        };
        let feature_limits = {
          backups: backups ? backups : checkexist[0].attributes.feature_limits.backups,
          databases: databases ? databases : checkexist[0].attributes.feature_limits.databases,
          allocations: allocations ? allocations : checkexist[0].attributes.feature_limits.allocations
        };

        let serverinfo = await fetch(settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/build", {
          method: "PATCH",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.pterodactyl.key}`,
          },
          body: JSON.stringify({
            allocation: checkexist[0].attributes.allocation,
            limits: limits,
            feature_limits: feature_limits,
          })
        })
        if (await serverinfo.statusText !== "OK") return res.redirect(`${redirectlink}?id=${req.query.id}&err=ERRORONMODIFY`);
        let text = JSON.parse(await serverinfo.text());
        log(`modify server`, `${req.session.userinfo.username} modified the server called \`${text.attributes.name}\` to have the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\nDatabases: ${databases}\nBackups: ${backups}\nAllocations: ${allocations}\`\`\``)
        console.log(`${req.session.userinfo.username} modified the server called \`${text.attributes.name}\` to have the following specs:\nMemory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\nDatabases: ${databases}\nBackups: ${backups}\nAllocations: ${allocations}`)
        pterorelationshipsserverdata.push(text);
        req.session.pterodactyl.relationships.servers.data = pterorelationshipsserverdata;
        let theme = indexjs.get(req);
        adminjs.suspend(req.session.userinfo.email);
        res.redirect("/dashboard?err=MODIFYSERVER");
      } else {
        res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(theme.settings.redirect.modifyserverdisabled ? theme.settings.redirect.modifyserverdisabled : "/");
    }
  });


  app.get("/delete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("An error has occur while attempting to delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.email);

      return res.redirect('/dashboard?err=DELETEDSERVER');
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });

  app.get(`/api/createdServer`, async (req, res) => {
    if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });

    const createdServer = await db.get(`createdserver-${req.session.userinfo.email}`)
    return res.json({ created: createdServer ?? false, cost: settings.renewals.cost })
  })
};
async function getPteroUser(userid, db) {
  return new Promise(async (resolve, reject) => {
      try {
          let cacheaccount = await fetch(
              settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + userid)) + "?include=servers",
              {
                  method: "get",
                  headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
              }
          );

          if (cacheaccount.statusText === "Not Found") {
              reject('Pterodactyl account not found');
          } else {
              let cacheaccountinfo = await cacheaccount.json();
              resolve(cacheaccountinfo);
          }
      } catch (error) {
          reject(error);
      }
  });
}
class Queue {
  constructor() {
      this.queue = []
      this.processing = false;
  }

  addJob(job) {
      this.queue.push(job)
      this.bumpQueue()
  }

  bumpQueue() {
      if (this.processing) return
      const job = this.queue.shift()
      if (!job) return
      const cb = () => {
          this.processing = false
          this.bumpQueue()
      }
      this.processing = true
      job(cb)
  }
}
