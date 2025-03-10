const Assets = require("../models/assetModel");

const assetController = {
  getAllAssets: async (req, res) => {
    try {
      const assets = await Assets.find()
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(assets);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getAssetById: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id)
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(asset);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  createAsset: async (req, res) => {
    try {
      const asset = await Assets.create({
        asset_code: req.body.asset_code,
        asset_name: req.body.asset_name,
        specifications: req.body.specifications,
        year_of_use: req.body.year_of_use,
        accounting: {
          quantity: req.body.accounting?.quantity,
          unit_price: req.body.accounting?.unit_price,
          origin_price: req.body.accounting?.origin_price,
        },
        quantity_differential: {
          real_count: req.body.quantity_differential?.real_count,
          surplus_quantity: req.body.quantity_differential?.surplus_quantity,
          missing_quantity: req.body.quantity_differential?.missing_quantity,
        },
        depreciation_rate: req.body.depreciation_rate,
        remaining_value: req.body.remaining_value,
        suggested_disposal: req.body.suggested_disposal,
        acquisition_source: req.body.acquisition_source,
        location: req.body.location,
        responsible_user: req.body.responsible_user,
        note: req.body.note,
      });
      res.status(201).json(asset);
    } catch (err) {
      // Trả về thông báo lỗi chi tiết hơn
      res.status(400).json({
        message: "Error creating asset",
        error: err.message,
        details: err,
      });
    }
  },

  updateAsset: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }

      const updatedAsset = await Assets.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            asset_code: req.body.asset_code,
            asset_name: req.body.asset_name,
            specifications: req.body.specifications,
            year_of_use: req.body.year_of_use,
            accounting: {
              quantity: req.body.accounting?.quantity,
              unit_price: req.body.accounting?.unit_price,
              origin_price: req.body.accounting?.origin_price,
            },
            quantity_differential: {
              real_count: req.body.quantity_differential?.real_count,
              surplus_quantity:
                req.body.quantity_differential?.surplus_quantity,
              missing_quantity:
                req.body.quantity_differential?.missing_quantity,
            },
            depreciation_rate: req.body.depreciation_rate,
            remaining_value: req.body.remaining_value,
            suggested_disposal: req.body.suggested_disposal,
            acquisition_source: req.body.acquisition_source,
            location: req.body.location,
            responsible_user: req.body.responsible_user,
            note: req.body.note,
          },
        },
        { new: true, runValidators: true }
      );
      res.status(200).json(updatedAsset);
    } catch (err) {
      res.status(400).json({
        message: "Error updating asset",
        error: err.message,
        details: err,
      });
    }
  },
  deleteAsset: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }
      await asset.deleteOne();
      res.status(200).json("Asset has been deleted");
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getAllAssetsByUser: async (req, res) => {
    try {
      const assets = await Assets.find({
        responsible_user: req.params.responsible_user,
      })
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(assets);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  addHistoryItem: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }

      asset.history.push({
        date: req.body.date,
        real_count: req.body.real_count,
        difference: req.body.difference,
      });

      await asset.save();
      res.status(200).json("History item has been added");
    } catch (err) {
      res.status(500).json(err);
    }
  },
};

module.exports = assetController;
