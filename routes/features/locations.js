const fetch = require("node-fetch");
const fs = require("fs");
const chalk = require("chalk");
const settings = require("../../settings.json");
const domain = settings.pterodactyl.domain;
const key = settings.pterodactyl.key;

module.exports.load = async function (app, db) {
  async function fetchLocations() {
    try {
      const response = await fetch(`${domain}/api/application/locations`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.pterodactyl.v1+json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch locations: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const locations = {};

      for (const location of data.data) {
        if (!location.attributes.short.includes("[HCNO]")) {
          locations[location.attributes.id] = {
            name: location.attributes.long,
            short: location.attributes.short,
            banner: `https://flagsapi.com/${location.attributes.short}/flat/48.png`,
            package: null,
          };
        }
      }

      return locations;
    } catch (error) {
      return null;
    }
  }

  async function updateSettingsWithLocations() {
    const locations = await fetchLocations();

    if (locations) {
      settings.api.client.locations = locations;
      fs.writeFile(
        "./settings.json",
        JSON.stringify(settings, null, 2),
        (err) => {
          if (err) {
            console.error("Failed to update settings.json:", err);
          } else {
            console.log()
            console.log(
              chalk.gray("[📍]") +
                chalk.cyan("[") +
                chalk.white("Nimbexa") +
                chalk.cyan("]") +
                chalk.white(" Successfully configured all locations ")
            );
            console.log()
          }
        }
      );
    }
  }

  updateSettingsWithLocations();
};
