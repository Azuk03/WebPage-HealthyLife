
import { where } from "sequelize";
import db from "../models";
import { raw } from "body-parser";
require('dotenv').config();
import _ from 'lodash'

const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;

let getTopDoctorHome = (limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findAll({
        limit: limit,
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: db.Allcode,
            as: "positionData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Allcode,
            as: "genderData",
            attributes: ["valueEn", "valueVi"],
          },
        ],
        raw: true,
        nest: true,
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

let getAllDoctors = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let doctors = await db.User.findAll({
        where: { roleId: "R2" },
        attributes: {
          exclude: ["password", "image"],
        },
      });
      resolve({
        errCode: 0,
        data: doctors,
      });
    } catch (error) {
      reject(error);
    }
  });
};

let saveDetailInfoDoctor = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !inputData.doctorId ||
        !inputData.contentHTML ||
        !inputData.contentMarkdown ||
        !inputData.action ||
        !inputData.selectedPrice ||
        !inputData.selectedPayment ||
        !inputData.selectedProvince ||
        !inputData.nameClinic ||
        !inputData.addressClinic ||
        !inputData.note
      ) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameters",
        });
      } else {

        // upsert to Markdown
        if(inputData.action === 'CREATE') {
          await db.Markdown.create({
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            description: inputData.description,
            doctorId: inputData.doctorId,
          });
        } else if(inputData.action === 'EDIT') {
          let doctorMarkdown = await db.Markdown.findOne({
            where: {doctorId: inputData.doctorId},
            raw: false
          })
          if(doctorMarkdown) {
            doctorMarkdown.contentHTML= inputData.contentHTML,
            doctorMarkdown.contentMarkdown= inputData.contentMarkdown,
            doctorMarkdown.description= inputData.description,

            await doctorMarkdown.save();
          }
        }

        // upsert to Doctor-Infor
        let doctorInfor = await db.Doctor_Infor.findOne({
          where: {doctorId: inputData.doctorId},
          raw: false
        })

        if(doctorInfor) {
            doctorInfor.doctorId = inputData.doctorId;
            doctorInfor.priceId = inputData.selectedPrice;
            doctorInfor.provinceId = inputData.selectedProvince;
            doctorInfor.paymentId = inputData.selectedPayment;
            doctorInfor.addressClinic = inputData.addressClinic;
            doctorInfor.nameClinic = inputData.nameClinic;
            doctorInfor.note = inputData.note;

            await doctorInfor.save();
        } else {
          await db.Doctor_Infor.create({
            doctorId: inputData.doctorId,
            priceId: inputData.selectedPrice,
            provinceId: inputData.selectedProvince,
            paymentId: inputData.selectedPayment,
            addressClinic: inputData.addressClinic,
            nameClinic: inputData.nameClinic,
            note: inputData.note,
          });
        }

        resolve({
          errCode: 0,
          errMessage: "Save doctor info succeed!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

let getDetailDoctorByIdService = (inputId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.User.findOne({
          where: { id: inputId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Markdown,
              attributes: ["description", "contentHTML", "contentMarkdown"],
            },
            {
              model: db.Allcode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (data && data.image) {
          data.image = new Buffer(data.image, "base64").toString("binary");
        }

        if (!data) {
          data = {};
        }
        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

let bulkCreateScheduleService = (data) => {
  return new Promise( async(resolve,reject) => {
    try {
        
        if(!data.arrSchedule || !data.doctorId || !data.formatedDate) {
          resolve({
            errCode: 1,
            errMessage: "Misssing required parameter!"
          })
        }else {
          let schedule = data.arrSchedule;
          if(schedule && schedule.length>0) {
            schedule = schedule.map(item => {
              item.maxNumber = MAX_NUMBER_SCHEDULE;
              return item;
            })
          }

          // get all existing data
          let existing = await db.Schedule.findAll(
            {
              where: {doctorId: data.doctorId, date: data.formatedDate},
              attributes: ['timeType', 'date', 'doctorId', 'maxNumber'],
              raw: true
            }
          )

          // compare diff
          let toCreate = _.differenceWith(schedule,existing,(a,b) => {
            return a.timeType === b.timeType && +a.date === +b.date;
          })

          // create data
          if(toCreate && toCreate.length>0) {
            await db.Schedule.bulkCreate(toCreate);
          }
          resolve({
            errCode: 0,
            errMessage: "Succeed!"
          })
        }
    } catch (error) {
      reject(error);
    }
  })
}

let getScheduleByDateService = (doctorId,date) => {
  return new Promise(async(resolve, reject) => {
      try {
        if(!doctorId || !date) {
          resolve({
            errCode: 1,
            errMessage: "Missing required parameters!"
          })
        }else {
          let dataSchedule = await db.Schedule.findAll({
            where: {
              doctorId: doctorId,
              date: date
            },
            include: [
              {
                model: db.Allcode,
                as: "timeTypeData",
                attributes: ["valueEn", "valueVi"],
              },
            ],
            raw: false,
            nest: true,
          })

          if(!dataSchedule) {
            dataSchedule = [];
          }

          resolve({
            errCode: 0,
            data: dataSchedule
          })
        }
      } catch (error) {
        reject(error);
      }
  })
}

module.exports = {
  getTopDoctorHome: getTopDoctorHome,
  getAllDoctors: getAllDoctors,
  saveDetailInfoDoctor: saveDetailInfoDoctor,
  getDetailDoctorByIdService: getDetailDoctorByIdService,
  bulkCreateScheduleService: bulkCreateScheduleService,
  getScheduleByDateService: getScheduleByDateService
};
