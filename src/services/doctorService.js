import { where } from "sequelize";
import db from "../models";

let getTopDoctorHome = (limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findAll({
        limit: limit,
        where: {roleId: 'R2'},
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
        },
        include: [
            {model: db.Allcode, as: 'positionData', attributes: ['valueEn', 'valueVi']},
            {model: db.Allcode, as: 'genderData', attributes: ['valueEn', 'valueVi']},
        ],
        raw: true,
        nest: true
      });

      resolve({
        errCode: 0,
        data: users,
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  getTopDoctorHome: getTopDoctorHome,
};
