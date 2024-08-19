import {
  Bot,
  DateTime,
  Interaction,
  InteractionResponseTypes,
  Member,
  validatePermissions,
} from "deps";

export async function defer(bot: Bot, interaction: Interaction) {
  await bot.helpers.sendInteractionResponse(
    interaction.id,
    interaction.token,
    {
      type: InteractionResponseTypes.DeferredChannelMessageWithSource,
    },
  );
}

export async function sendFollowupMessage(
  bot: Bot,
  token: string,
  message: string,
  isEphemeral = false,
) {
  return await bot.helpers.sendFollowupMessage(
    token,
    {
      type: InteractionResponseTypes.DeferredUpdateMessage,
      data: {
        content: message,
        flags: isEphemeral ? 64 : 0,
      },
    },
  );
}

export async function sendMessage(
  bot: Bot,
  channelId: string,
  message: string,
) {
  await bot.helpers.sendMessage(
    channelId,
    {
      content: message,
    },
  );
}

export async function send(
  bot: Bot,
  interaction: Interaction,
  message: string,
  first = true,
  isEphemeral = false,
): Promise<void> {
  if (!interaction.channelId) {
    throw new Error("unable to retrieve channel ID!");
  }

  if (first) {
    await defer(bot, interaction);
    await sendFollowupMessage(
      bot,
      interaction.token,
      message,
      isEphemeral,
    );
  } else {
    await sendMessage(
      bot,
      interaction.channelId.toString(),
      message,
    );
  }
}

export async function sendInteractiveResponse(
  bot: Bot,
  interaction: Interaction,
  message: string,
  isEphemeral = false,
) {
  await bot.helpers.sendInteractionResponse(
    interaction.id,
    interaction.token,
    {
      type: InteractionResponseTypes.ChannelMessageWithSource,
      data: { content: message, flags: isEphemeral ? 64 : 0 },
    },
  );
  await defer(bot, interaction);
}

export function convertTimeToUTC(time: string, timeZone: string): string {
  // Create a DateTime object in the specified time zone
  const dateTimeInZone = DateTime.fromISO(
    `${new Date().toISOString().split("T")[0]}T${time}:00`,
    { zone: timeZone },
  );

  // Convert this DateTime to UTC
  const utcDateTime = dateTimeInZone.toUTC();

  // Return the time portion in UTC
  return utcDateTime.toFormat("HH:mm");
}

export function convertUTCToTimeZone(
  utcTime: string,
  targetTimeZone: string,
): string {
  const currentDate = new Date().toISOString().split("T")[0];

  // Create a DateTime object using the current date and provided UTC time
  const utcDateTime = DateTime.fromISO(`${currentDate}T${utcTime}:00Z`);

  // Convert the UTC DateTime to the target time zone
  const dateTimeInZone = utcDateTime.setZone(targetTimeZone);

  // Return the time portion in the target time zone
  return dateTimeInZone.toFormat("HH:mm");
}

export async function memberHasAdminPermissions(
  bot: Bot,
  guildId: bigint,
  member?: Member,
): Promise<boolean> {
  if (!member) return false;

  try {
    // Fetch the guild's roles to get the permissions for the member
    const guild = await bot.helpers.getGuild(guildId);

    // Check if the member is the guild owner
    if (member.user && guild.ownerId === member.user.id) {
      return true;
    }

    // Combine all the member's role permissions
    let permissions = 0n;
    for (const roleId of member.roles) {
      const role = guild.roles.get(roleId);
      if (!role) continue;

      permissions |= role.permissions;
    }

    // Use validatePermissions to check if the combined permissions include ADMINISTRATOR
    return validatePermissions(permissions, ["ADMINISTRATOR"]);
  } catch (_error) {
    return false;
  }
}
