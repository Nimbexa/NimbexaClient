const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const settings = require("../../settings.json");
const fs = require("fs");
const ejs = require("ejs");
const log = require('../handlers/webhook.js')

module.exports.load = async function(app, db) {
  let maxram = null;
  let maxcpu = null;
  let maxservers = null;
  let maxdisk = null;
  app.get("/buyram", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseram ? theme.settings.redirect.failedpurchaseram : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let ramcap = await db.get("ram-" + req.session.userinfo.email);
      ramcap = ramcap ? ramcap : 0;
        
      if (ramcap + amount > settings.storelimits.ram) return res.redirect(failedcallback + "?err=MAXRAMEXCEETED");

      let per = newsettings.api.client.coins.store.ram.per * amount;
      let cost = newsettings.api.client.coins.store.ram.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newram = ramcap + amount;
      if(newram > settings.storelimits.ram) return res.send("You reached max ram limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("ram-" + req.session.userinfo.email, newram);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("ram-" + req.session.userinfo.email, newram);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.ram = extra.ram + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought ram`, `${req.session.userinfo.username} bought ${per}\MB ram from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per}\MB ram from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchaseram ? theme.settings.redirect.purchaseram : "/") + "?err=none");
    }
  });

  app.get("/buydisk", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchasedisk ? theme.settings.redirect.failedpurchasedisk : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let diskcap = await db.get("disk-" + req.session.userinfo.email);
      diskcap = diskcap ? diskcap : 0;
        
      if (diskcap + amount > settings.storelimits.disk) return res.redirect(failedcallback + "?err=MAXDISKEXCEETED");

      let per = newsettings.api.client.coins.store.disk.per * amount;
      let cost = newsettings.api.client.coins.store.disk.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newdisk = diskcap + amount;
      if(newdisk > settings.storelimits.disk) return res.send("You reached max disk limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("disk-" + req.session.userinfo.email, newdisk);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("disk-" + req.session.userinfo.email, newdisk);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.disk = extra.disk + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought disk`, `${req.session.userinfo.username} bought ${per}MB disk from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per}MB disk from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchasedisk ? theme.settings.redirect.purchasedisk : "/") + "?err=none");
    }
  });

  app.get("/buycpu", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchasecpu ? theme.settings.redirect.failedpurchasecpu : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let  cpucap = await db.get("cpu-" + req.session.userinfo.email);
      cpucap = cpucap ? cpucap : 0;
        
      if (cpucap + amount > settings.storelimits.cpu) return res.redirect(failedcallback + "?err=MAXCPUEXCEETED");

      let per = newsettings.api.client.coins.store.cpu.per * amount;
      let cost = newsettings.api.client.coins.store.cpu.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newcpu = cpucap + amount;
      if(newcpu > settings.storelimits.cpu) return res.send("You reached max cpu limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("cpu-" + req.session.userinfo.email, newcpu);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("cpu-" + req.session.userinfo.email, newcpu);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.cpu = extra.cpu + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought cpu`, `${req.session.userinfo.username} bought ${per}% cpu from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per}% cpu from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchasecpu ? theme.settings.redirect.purchasecpu : "/") + "?err=none");
    }
  });

  app.get("/buyservers", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseservers ? theme.settings.redirect.failedpurchaseservers : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let serverscap = await db.get("servers-" + req.session.userinfo.email);
      serverscap = serverscap ? serverscap : 0;
        
      if (serverscap + amount > settings.storelimits.servers) return res.redirect(failedcallback + "?err=MAXSERVERSEXCEETED");

      let per = newsettings.api.client.coins.store.servers.per * amount;
      let cost = newsettings.api.client.coins.store.servers.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newservers = serverscap + amount;
      if(newservers > settings.storelimits.servers) return res.send("Reached max server limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("servers-" + req.session.userinfo.email, newservers);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("servers-" + req.session.userinfo.email, newservers);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.servers = extra.servers + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought servers`, `${req.session.userinfo.username} bought ${per} Slots from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per} Slots from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchaseservers ? theme.settings.redirect.purchaseservers : "/") + "?err=none");
    }
  });

  app.get("/buydatabases", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseram ? theme.settings.redirect.failedpurchaseram : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let databasescap = await db.get("databases-" + req.session.userinfo.email);
      databasescap = databasescap ? databasescap : 0;
        
      if (databasescap + amount > settings.storelimits.databases) return res.redirect(failedcallback + "?err=MAXIMUMLIMIT");

      let per = newsettings.api.client.coins.store.databases.per * amount;
      let cost = newsettings.api.client.coins.store.databases.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newdatabases = databasescap + amount;
      if(newdatabases > settings.storelimits.databases) return res.send("You reached max database limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("databases-" + req.session.userinfo.email, newdatabases);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("databases-" + req.session.userinfo.email, newdatabases);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.databases = extra.databases + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0 && extra.databases == 0 && extra.backups == 0 && extra.allocations == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought databases`, `${req.session.userinfo.username} bought ${per} databases from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per} databases from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchaseram ? theme.settings.redirect.purchaseram : "/") + "?err=none");
    }
  });

  app.get("/buybackups", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseram ? theme.settings.redirect.failedpurchaseram : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let backupscap = await db.get("backups-" + req.session.userinfo.email);
      backupscap = backupscap ? backupscap : 0;
        
      if (backupscap + amount > settings.storelimits.backups) return res.redirect(failedcallback + "?err=MAXIMUMLIMIT");

      let per = newsettings.api.client.coins.store.backups.per * amount;
      let cost = newsettings.api.client.coins.store.backups.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newbackups = backupscap + amount;
      if(newbackups > settings.storelimits.backups) return res.send("You reached max backups limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("backups-" + req.session.userinfo.email, newbackups);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("backups-" + req.session.userinfo.email, newbackups);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.backups = extra.backups + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0 && extra.databases == 0 && extra.backups == 0 && extra.allocations == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought backups`, `${req.session.userinfo.username} bought ${per} backups from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per} backups from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchaseram ? theme.settings.redirect.purchaseram : "/") + "?err=none");
    }
  });

  app.get("/buyallocations", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

    if (!amount) return res.send("missing amount");

    amount = parseFloat(amount);

    if (isNaN(amount)) return res.send("amount is not a number");
    
    if (amount < 0) return res.send("amount cannot be negative");
    
    if (amount === 0) return res.send("amount must be greater than zero");

    if (amount < 1 || amount > 10);
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseram ? theme.settings.redirect.failedpurchaseram : "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.email);
      usercoins = usercoins ? usercoins : 0;
        
      let allocationscap = await db.get("allocations-" + req.session.userinfo.email);
      allocationscap = allocationscap ? allocationscap : 0;
        
      if (allocationscap + amount > settings.storelimits.allocations) return res.redirect(failedcallback + "?err=MAXIMUMLIMIT");

      let per = newsettings.api.client.coins.store.allocations.per * amount;
      let cost = newsettings.api.client.coins.store.allocations.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;
      let newallocations = allocationscap + amount;
      if(newallocations > settings.storelimits.allocations) return res.send("You reached max database limit!");
      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.email);
        await db.set("allocations-" + req.session.userinfo.email, newallocations);
      } else {
        await db.set("coins-" + req.session.userinfo.email, newusercoins);
        await db.set("allocations-" + req.session.userinfo.email, newallocations);
      }

      let extra = await db.get("extra-" + req.session.userinfo.email);
      extra = extra ? extra : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        databases: 0,
        backups: 0,
        allocations: 0
      };

      extra.allocations = extra.allocations + per;

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0 && extra.databases == 0 && extra.backups == 0 && extra.allocations == 0) {
        await db.delete("extra-" + req.session.userinfo.email);
      } else {
        await db.set("extra-" + req.session.userinfo.email, extra);
      }

      adminjs.suspend(req.session.userinfo.email);

      log(`bought allocations`, `${req.session.userinfo.username} bought ${per} allocations from the store for \`${cost}\` Credits.`)
      console.log(`${req.session.userinfo.username} bought ${per} allocations from the store for ${cost} Credits.`)

      res.redirect((theme.settings.redirect.purchaseram ? theme.settings.redirect.purchaseram : "/") + "?err=none");
    }
  });

  async function enabledCheck(req, res) {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.coins.store.enabled == true) return newsettings;
    let theme = indexjs.get(req);
    ejs.renderFile(
      `./views/${theme.name}/${theme.settings.notfound}`, 
      await eval(indexjs.renderdataeval),
      null,
    function (err, str) {
      delete req.session.newaccount;
      if (err) {
        console.log(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`);
        console.log(err);
        return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
      };
      res.status(200);
      res.send(str);
    });
    return null;
  }
}
