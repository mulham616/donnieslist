const Comment = require('../models/comment')
const mongoose = require('mongoose');

exports.getComments = (req, res, next) => {
  var slug = req.params.slug;
  Comment.aggregate([
    {
      $match: { parentId: '-1', expert: slug }
    },
    {
      $project: {
        id: { $toString: "$_id" },
        author: 1,
        text: 1,
        voters: 1
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "slug",
        as: "users"
      }
    },
    {
      $lookup: {
        from: "comments",
        let: {
          parent_id: "$id"
        },
        /* localField: "id",
        foreignField: "parentId", */
        pipeline: [{
          $project: {
            id: { $toString:"$_id" },
            parentId: 1,
            author: 1,
            text: 1,
            voters: 1
          }
        },{
          $match: { $expr: { $eq: ["$parentId", "$$parent_id"] } }
        },{
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "slug",
            as: "users"
          }
        },{
          $group:{
             _id: "$_id",
             authorId: { $first: "$author" },
             text:{ $first: "$text" },
             voters: { $first: '$voters' },
             authorName: { $first: { $arrayElemAt: ["$users.profile", 0] } },
             profileImage: { $first: { $arrayElemAt: ["$users.profileImage", 0] } }
          }
        }],
        as: "answers"
      }
    },
    {
      $group:{
       _id: "$_id",
       authorId: { $first: "$author" },
       text:{ $first: "$text" },
       voters: { $first: "$voters" },
       answers: { $first: "$answers" },
       authorName: { $first: { $arrayElemAt: ["$users.profile", 0] } },
       profileImage: { $first: { $arrayElemAt: ["$users.profileImage", 0] } }
      }
    }
  ]).exec(
    (err, comments) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err
        });
      }
      return res.status(200).json({
        success: true,
        data: comments
      });
    }
  );
}

exports.addComment = (req, res, next) => {
  const comment = new Comment();
  const { expert, author, text, parentId } = req.body;
  if (!author || !text || !parentId) {
    return res.json({
      success: false,
      error: { message: 'You must provide an author, comment and parentId' }
    });
  }
  comment.expert = expert;
  comment.author = author;
  comment.text = text;
  comment.parentId = parentId;
  comment.save(err => {
    if (err) {
      return res.json({
        success: false,
        error: err
      });
    }
    return res.json({
      success: true
    });
  });
}

exports.updateComment = (req, res, next) => {
  const { text, updateId } = req.body;
  if (!updateId) {
    return res.json({
      success: false,
      error: { message: 'No comment id provided' }
    });
  }
  Comment.findById(updateId, (error, comment) => {
    if (error) {
      return res.json({
        success: false,
        error
      });
    }
    if (text) comment.text = text;
    comment.save(error => {
      if (error) {
        return res.json({
          success: false,
          error
        });
      }
      return res.json({
        success: true
      });
    });
  });
}

exports.likeComment = (req, res, next) => {
  const { id, author } = req.body;
  if (!id) {
    return res.json({
      success: false,
      error: { message: 'No comment id provided' }
    });
  }
  Comment.findById(id, (error, comment) => {
    if (error) {
      return res.json({
        success: false,
        error
      });
    }
    let voter = comment.voters.find(voter => voter.slug == author);
    if(voter == undefined || !voter){
      comment.voters.push({ slug: author });
      comment.markModified('voters');
    } else {
      comment.voters = comment.voters.filter(voter => voter.slug != author);
    }
    comment.save(error => {
      if (error) {
        return res.json({
          success: false,
          error
        });
      }
      return res.json({
        success: true
      });
    });
  });
}

exports.dislikeComment = (req, res, next) => {
  const { id, author } = req.body;
  if (!id) {
    return res.json({
      success: false,
      error: { message: 'No comment id provided' }
    });
  }
  Comment.findById(id, (error, comment) => {
    if (error) {
      return res.json({
        success: false,
        error
      });
    }
    comment.voters = comment.voters.filter(voter => voter.slug != author);
    comment.save(error => {
      if (error) {
        return res.json({
          success: false,
          error
        });
      }
      return res.json({
        success: true
      });
    });
  });
}

exports.deleteComment = (req, res, next) => {
  const { id } = req.body;
  if (!id) {
    return res.json({
      success: false,
      error: { message: 'No comment id provided' }
    });
  }
  Comment.remove({ $or: [ { _id: new mongoose.Types.ObjectId(id) }, { parentId: id } ] }, (error, comment) => {
    if (error) {
      return res.json({
        success: false,
        error
      });
    }
    return res.json({
      success: true
    });
  });
}